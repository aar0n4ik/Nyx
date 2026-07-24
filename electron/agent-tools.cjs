'use strict'
// Схема инструментов для function-calling модели (@qvac/sdk / OpenAI-совместимый формат).
// Модель сама решает что и когда вызвать по словам пользователя.
const core = require('./tools-core.cjs')

const NYX_TOOLS = [
  { type: 'function', function: { name: 'listApps',
    description: 'Список установленных приложений с реальным размером и логотипом.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'runRemovalJob',
    description: 'Удалить выбранные приложения. Рекомендуется бэкап. Возвращает прогресс.',
    parameters: { type: 'object', properties: {
      apps: { type: 'array', items: { type: 'object' } },
      backupWindows: { type: 'boolean' }, backupNyx: { type: 'boolean' } }, required: ['apps'] } } },
  { type: 'function', function: { name: 'setRegistry',
    description: 'Применить твик реестра.',
    parameters: { type: 'object', properties: {
      path: { type: 'string' }, name: { type: 'string' }, value: {}, type: { type: 'string' } }, required: ['path','name','value'] } } },
  { type: 'function', function: { name: 'wingetInstall',
    description: 'Установить приложение через winget по id.',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } } },
  { type: 'function', function: { name: 'listPresets',
    description: 'Готовые сборки из реестра (с описанием, рейтингом, сайтом).', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'createProfileLauncher',
    description: 'Создать профиль-лаунчер (ярлык) для набора приложений: игры, работа и т.д.',
    parameters: { type: 'object', properties: { name: { type: 'string' }, targets: { type: 'array', items: { type: 'string' } } }, required: ['name','targets'] } } },
  { type: 'function', function: { name: 'addToStartup',
    description: 'Запускать цель при включении ПК.',
    parameters: { type: 'object', properties: { name: { type: 'string' }, target: { type: 'string' } }, required: ['name','target'] } } },
  { type: 'function', function: { name: 'scheduleTask',
    description: 'Запускать цель по расписанию (ежедневно во время time HH:mm).',
    parameters: { type: 'object', properties: { name: { type: 'string' }, target: { type: 'string' }, time: { type: 'string' } }, required: ['name','target'] } } },
]

// Диспетчер: модель прислала tool_call -> выполняем реальный инструмент.
async function runTool(name, args = {}, onProgress = () => {}) {
  switch (name) {
    case 'listApps':      return core.listApps()
    case 'listPresets':   return core.listPresets()
    case 'runRemovalJob': return core.runRemovalJob(args, onProgress)
    case 'setRegistry':   return core.setRegistry(args, onProgress)
    case 'wingetInstall': return core.wingetInstall(args.id)
    case 'createProfileLauncher': return core.createProfileLauncher(args)
    case 'addToStartup':  return core.addToStartup(args)
    case 'scheduleTask':  return core.scheduleTask(args, onProgress)
    default: throw new Error('Unknown tool: ' + name)
  }
}

module.exports = { NYX_TOOLS, runTool }
