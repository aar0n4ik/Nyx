// PC infrastructure module. Collects the trader's hardware/OS profile.
// Cross-platform: Node `os` for basics; Windows PowerShell (Get-CimInstance) and
// Linux /proc for detail. Optional `systeminformation` is used if installed.
import os from "node:os"
import { execFile } from "node:child_process"
import net from "node:net"
import { promisify } from "node:util"

const pexec = promisify(execFile)
const isWin = process.platform === "win32"

// Live CPU load via os.cpus() time-delta sampling (cross-platform). os.loadavg()
// is always 0 on Windows, which produced the bogus static "CPU 0%" reading.
function cpuTimes() {
	const cpus = os.cpus() || []
	let idle = 0, total = 0
	for (const c of cpus) { for (const v of Object.values(c.times)) total += v; idle += c.times.idle }
	return { idle, total }
}
function sampleCpuLoad(ms = 180) {
	return new Promise((resolve) => {
		const a = cpuTimes()
		setTimeout(() => {
			const b = cpuTimes()
			const idle = b.idle - a.idle, total = b.total - a.total
			resolve(total > 0 ? Math.max(0, Math.min(100, Math.round((1 - idle / total) * 100))) : null)
		}, ms)
	})
}

async function ps(cmd) {
	const { stdout } = await pexec("powershell.exe", ["-NoProfile", "-Command", cmd], { timeout: 8000, encoding: "utf8" })
	return String(stdout).trim()
}

async function tryWindowsDetail() {
	const out = {}
	try { out.cpu = await ps("(Get-CimInstance Win32_Processor).Name") } catch {}
	try { out.gpu = (await ps("(Get-CimInstance Win32_VideoController).Name")).split(/\r?\n/).filter(Boolean) } catch {}
	try { out.board = await ps("(Get-CimInstance Win32_BaseBoard).Manufacturer + ' ' + (Get-CimInstance Win32_BaseBoard).Product") } catch {}
	try { out.bios = await ps("(Get-CimInstance Win32_BIOS).SMBIOSBIOSVersion") } catch {}
	try { out.osBuild = await ps("(Get-CimInstance Win32_OperatingSystem).Caption + ' build ' + (Get-CimInstance Win32_OperatingSystem).BuildNumber") } catch {}
	try {
		const disks = await ps("Get-CimInstance Win32_DiskDrive | ForEach-Object { $_.Model + '|' + [math]::Round($_.Size/1GB) }")
		out.disks = disks.split(/\r?\n/).filter(Boolean).map((l) => { const [model, gb] = l.split("|"); return { model, sizeGB: Number(gb) } })
	} catch {}
	try { out.directX = await ps("(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\DirectX').Version") } catch {}
	return out
}

// Optional richer data if the user installed `systeminformation`.
async function trySysInfo() {
	try {
		const si = await import("systeminformation")
		const [cpu, mem, graphics, disk, temp, osInfo] = await Promise.all([
			si.cpu(), si.mem(), si.graphics(), si.diskLayout(), si.cpuTemperature(), si.osInfo(),
		])
		return {
			cpu: `${cpu.manufacturer} ${cpu.brand} (${cpu.physicalCores}C/${cpu.cores}T @ ${cpu.speed}GHz)`,
			gpu: graphics.controllers.map((g) => g.model),
			ramGB: +(mem.total / 1e9).toFixed(1),
			ramFreeGB: +(mem.available / 1e9).toFixed(1),
			disks: disk.map((d) => ({ model: d.name, sizeGB: Math.round(d.size / 1e9) })),
			tempC: temp.main || null,
			osBuild: `${osInfo.distro} ${osInfo.release} (${osInfo.arch})`,
		}
	} catch { return null }
}

export async function collectSpecs() {
	const base = {
		hostname: os.hostname(),
		platform: process.platform,
		arch: os.arch(),
		cpu: os.cpus()?.[0]?.model?.trim() || "unknown",
		cores: os.cpus()?.length || 0,
		ramGB: +(os.totalmem() / 1e9).toFixed(1),
		ramFreeGB: +(os.freemem() / 1e9).toFixed(1),
		loadAvg: os.loadavg?.()[0] ?? null,
		uptimeH: +(os.uptime() / 3600).toFixed(1),
		osBuild: `${os.type()} ${os.release()}`,
	}
	const rich = (await trySysInfo()) || {}
	const winDetail = isWin ? await tryWindowsDetail() : {}
	const specs = { ...base, ...winDetail, ...rich }
	specs.ramUsedPct = base.ramGB ? Math.round(((base.ramGB - (specs.ramFreeGB ?? base.ramFreeGB)) / base.ramGB) * 100) : null
	const liveCpu = await sampleCpuLoad()
	specs.cpuLoadPct = liveCpu != null
		? liveCpu
		: (base.loadAvg != null && base.cores ? Math.min(100, Math.round((base.loadAvg / base.cores) * 100)) : null)
	return specs
}

// Pre-trade risk advisory based on specs + latency.
