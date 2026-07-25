window.NYXI = window.NYXI || {};
NYXI.ru = NYXI.ru || {};
Object.assign(NYXI.ru, {
  "Choose your brain":"Выбери свой мозг",
  "One app. A model for every PC.":"Одно приложение. Модель для любого ПК.",
  "Nyx isn't locked to a single model. Weak laptop or a beast rig - pick the size that runs smoothly on your hardware. On first launch Nyx checks your specs and pre-selects the best fit; you can switch anytime.":"Nyx не привязан к одной модели. Слабый ноутбук или мощная сборка — выбери размер, который плавно работает на твоём железе. При первом запуске Nyx проверяет характеристики и заранее подбирает лучший вариант; сменить можно в любой момент.",
  "~1B params":"~1 млрд параметров",
  "~4B params":"~4 млрд параметров",
  "~8B params":"~8 млрд параметров",
  "~3B params":"~3 млрд параметров",
  "For older laptops and office PCs with no graphics card.":"Для старых ноутбуков и офисных ПК без видеокарты.",
  "The sweet spot for most modern laptops and desktops.":"Золотая середина для большинства современных ноутбуков и ПК.",
  "For gaming PCs and workstations with a real GPU.":"Для игровых ПК и рабочих станций с настоящей видеокартой.",
  "A light step up from Lite for everyday work on typical laptops.":"Лёгкий шаг вперёд от Lite для повседневной работы на обычных ноутбуках.",
  "Most people pick this":"Выбор большинства",
  "Runs on":"Работает на",
  "Memory":"Память",
  "Feel":"Ощущение",
  "Best for":"Лучше всего для",
  "CPU only":"Только процессор",
  "CPU or entry GPU":"Процессор или начальная видеокарта",
  "CPU or a basic laptop GPU":"Процессор или простая видеокарта ноутбука",
  "8-12 GB VRAM GPU":"Видеокарта с 8–12 ГБ VRAM",
  "3 GB+ RAM":"3 ГБ+ ОЗУ",
  "6 GB+ RAM":"6 ГБ+ ОЗУ",
  "8 GB+ RAM":"8 ГБ+ ОЗУ",
  "16 GB+ RAM":"16 ГБ+ ОЗУ",
  "Instant, snappy":"Мгновенно и шустро",
  "Fast & noticeably smarter":"Быстро и заметно умнее",
  "Deeper reasoning":"Более глубокие рассуждения",
  "Balanced speed and quality":"Баланс скорости и качества",
  "Quick tasks, files, everyday commands":"Быстрые задачи, файлы, повседневные команды",
  "Daily driving, writing, light coding":"Ежедневная работа, тексты, лёгкий код",
  "Coding, multi-step tasks, long context":"Код, многошаговые задачи, длинный контекст",
  "Everyday assistant tasks":"Повседневные задачи ассистента",
  "Built to stay smooth.":"Создан оставаться плавным.",
  "Nyx runs models through QVAC's on-device runtime with memory-saving quantization (TurboQuant), so even the Lite tier stays responsive on modest hardware and bigger models don't eat all your VRAM. If your PC ever struggles, drop a tier and Nyx keeps up.":"Nyx запускает модели через локальный рантайм QVAC с экономящим память квантованием (TurboQuant), так что даже уровень Lite остаётся отзывчивым на скромном железе, а модели покрупнее не съедают всю видеопамять. Если ПК начинает тормозить — опустись на уровень ниже, и Nyx не отстанет."
});
(function(){
  var NK={
    "~1B params":{uk:"~1 млрд параметрів",es:"~1 mil M de parámetros",de:"~1 Mrd. Parameter",fr:"~1 Md de paramètres"},
    "~4B params":{uk:"~4 млрд параметрів",es:"~4 mil M de parámetros",de:"~4 Mrd. Parameter",fr:"~4 Md de paramètres"},
    "~8B params":{uk:"~8 млрд параметрів",es:"~8 mil M de parámetros",de:"~8 Mrd. Parameter",fr:"~8 Md de paramètres"},
    "~3B params":{uk:"~3 млрд параметрів",es:"~3 mil M de parámetros",de:"~3 Mrd. Parameter",fr:"~3 Md de paramètres"},
    "A light step up from Lite for everyday work on typical laptops.":{uk:"Легкий крок уперед від Lite для повсякденної роботи на звичайних ноутбуках.",es:"Un paso ligero por encima de Lite para el trabajo diario en portátiles típicos.",de:"Ein kleiner Schritt über Lite für die tägliche Arbeit auf typischen Laptops.",fr:"Un petit cran au-dessus de Lite pour le travail quotidien sur des portables classiques."},
    "3 GB+ RAM":{uk:"3 ГБ+ ОЗП",es:"3 GB+ de RAM",de:"3 GB+ RAM",fr:"3 Go+ de RAM"},
    "6 GB+ RAM":{uk:"6 ГБ+ ОЗП",es:"6 GB+ de RAM",de:"6 GB+ RAM",fr:"6 Go+ de RAM"},
    "8 GB+ RAM":{uk:"8 ГБ+ ОЗП",es:"8 GB+ de RAM",de:"8 GB+ RAM",fr:"8 Go+ de RAM"},
    "CPU or a basic laptop GPU":{uk:"Процесор або проста відеокарта ноутбука",es:"CPU o una GPU básica de portátil",de:"CPU oder eine einfache Laptop-GPU",fr:"CPU ou un GPU basique de portable"},
    "Balanced speed and quality":{uk:"Баланс швидкості та якості",es:"Equilibrio entre velocidad y calidad",de:"Ausgewogene Geschwindigkeit und Qualität",fr:"Équilibre entre vitesse et qualité"},
    "Everyday assistant tasks":{uk:"Щоденні задачі асистента",es:"Tareas de asistente del día a día",de:"Alltägliche Assistenzaufgaben",fr:"Tâches d'assistant du quotidien"},
    "~120 MB app + 1-5 GB per model":{uk:"застосунок ~120 МБ + 1–5 ГБ на модель",es:"app de ~120 MB + 1–5 GB por modelo",de:"~120 MB App + 1–5 GB pro Modell",fr:"app de ~120 Mo + 1–5 Go par modèle"},
    "Your model is fetched a single time (1-5 GB by tier) and stored locally. After that Nyx works with no internet at all.":{uk:"Твоя модель завантажується один раз (1–5 ГБ залежно від рівня) і зберігається локально. Після цього Nyx працює взагалі без інтернету.",es:"Tu modelo se descarga una sola vez (1–5 GB según el nivel) y se guarda localmente. Después Nyx funciona sin nada de internet.",de:"Dein Modell wird ein einziges Mal geladen (1–5 GB je nach Stufe) und lokal gespeichert. Danach läuft Nyx komplett ohne Internet.",fr:"Ton modèle est récupéré une seule fois (1–5 Go selon le niveau) et stocké localement. Ensuite Nyx fonctionne sans aucune connexion."},
    "The app itself is small (~120 MB). Each model you pick is downloaded once and stored locally - about 1 GB for the Lite tier up to about 5 GB for the Pro tier. You only ever download the models you choose.":{uk:"Сам застосунок маленький (~120 МБ). Кожна обрана модель завантажується один раз і зберігається локально — приблизно від 1 ГБ для рівня Lite до близько 5 ГБ для рівня Pro. Ти завантажуєш лише ті моделі, які обираєш.",es:"La app en sí es pequeña (~120 MB). Cada modelo que eliges se descarga una vez y se guarda localmente: más o menos 1 GB para el nivel Lite hasta unos 5 GB para el nivel Pro. Solo descargas los modelos que eliges.",de:"Die App selbst ist klein (~120 MB). Jedes Modell, das du wählst, wird einmal geladen und lokal gespeichert – etwa 1 GB für die Lite-Stufe bis rund 5 GB für die Pro-Stufe. Du lädst immer nur die Modelle, die du auswählst.",fr:"L'app elle-même est petite (~120 Mo). Chaque modèle que tu choisis est téléchargé une fois et stocké localement — environ 1 Go pour le niveau Lite jusqu'à environ 5 Go pour le niveau Pro. Tu ne télécharges que les modèles que tu choisis."}
  };
  var LS=["uk","es","de","fr"];
  Object.keys(NK).forEach(function(key){
    LS.forEach(function(l){
      NYXI[l]=NYXI[l]||{};
      if(NK[key][l]!=null) NYXI[l][key]=NK[key][l];
    });
  });
})();
Object.assign(NYXI.ru, {
  "Up and running in about a minute.":"Готово к работе примерно за минуту.",
  "One download for Windows. No account, no setup maze - install it, pick a model that fits your PC, and start asking.":"Одна загрузка для Windows. Без аккаунта, без лабиринта настроек — установи, выбери модель под свой ПК и начинай спрашивать.",
  "Nyx for Windows":"Nyx для Windows",
  "Download for Windows →":"Скачать для Windows →",
  "macOS and Linux builds are on the way. Today Nyx is tuned and tested for Windows.":"Сборки для macOS и Linux уже в пути. Сегодня Nyx настроен и протестирован под Windows.",
  "Cost":"Стоимость",
  "Account":"Аккаунт",
  "Internet":"Интернет",
  "Disk":"Диск",
  "Free & open source":"Бесплатно и с открытым кодом",
  "None needed":"Не нужен",
  "Only to download - runs offline after":"Только чтобы скачать — дальше работает офлайн",
  "~120 MB app + 1-5 GB per model":"приложение ~120 МБ + 1–5 ГБ на модель",
  "Download & install":"Скачай и установи",
  "Pick your model":"Выбери модель",
  "It downloads once":"Скачивается один раз",
  "Just ask":"Просто спроси",
  "Grab the installer, run it, click through. No admin gymnastics, no bundled junk - about a minute start to finish.":"Возьми установщик, запусти, пройди шаги. Без плясок с правами администратора, без лишнего мусора — примерно минута от начала до конца.",
  "On first launch Nyx reads your hardware and recommends a model that will run smoothly.":"При первом запуске Nyx считывает твоё железо и рекомендует модель, которая пойдёт плавно.",
  "See which one fits your PC →":"Посмотри, какая подойдёт твоему ПК →",
  "Your model is fetched a single time (1-5 GB by tier) and stored locally. After that Nyx works with no internet at all.":"Модель скачивается один раз (1–5 ГБ в зависимости от уровня) и хранится локально. После этого Nyx работает вообще без интернета.",
  "Type what you want in plain words. Nyx shows a plan, you approve, it acts - and every run is signed to ./evidence.":"Напиши обычными словами, что нужно. Nyx показывает план, ты подтверждаешь, он действует — и каждый запуск подписывается в ./evidence.",
  "Good questions":"Хорошие вопросы",
  "Everything you're probably wondering.":"Всё, о чём ты наверняка задумываешься.",
  "Is my data actually private?":"Мои данные действительно приватны?",
  "Completely. Everything runs on your machine - your files, your prompts, and the model itself never leave your PC. No account, no cloud, no telemetry. Pull out the network cable and Nyx still works.":"Полностью. Всё работает на твоей машине — твои файлы, твои запросы и сама модель никогда не покидают ПК. Без аккаунта, без облака, без телеметрии. Выдерни сетевой кабель — и Nyx всё равно работает.",
  "Will it slow down or lag my computer?":"Не замедлит ли это мой компьютер, не будет ли тормозить?",
  "Nyx is built to stay light. It runs a model sized for your hardware and only loads it while you're actually using it. On a modest PC, choose the Lite tier and it stays responsive - if things ever feel heavy, drop a tier and it speeds right back up.":"Nyx создан оставаться лёгким. Он запускает модель под размер твоего железа и загружает её только пока ты ей пользуешься. На скромном ПК выбери уровень Lite — и он остаётся отзывчивым; если станет тяжело, опустись на уровень ниже, и скорость сразу вернётся.",
  "What if my PC is weak or a few years old?":"А если мой ПК слабый или ему уже несколько лет?",
  "You're covered. Nyx runs on CPU-only machines with 8 GB of RAM using the Lite model. On first launch it checks your specs and recommends the model that will actually run well - no guessing, no trial and error.":"Ты под защитой. Nyx работает на машинах только с процессором и 8 ГБ ОЗУ на модели Lite. При первом запуске он проверяет характеристики и рекомендует модель, которая реально пойдёт хорошо — без догадок и проб с ошибками.",
  "Can I choose which model to use?":"Могу ли я выбирать, какую модель использовать?",
  "Yes - Nyx isn't tied to one model. Start with the recommended pick and switch to a bigger or smaller one whenever you like, right inside the app.":"Да — Nyx не привязан к одной модели. Начни с рекомендованного варианта и переключайся на больший или меньший когда захочешь, прямо в приложении.",
  "Compare the tiers →":"Сравнить уровни →",
  "Is it safe to let an AI touch my PC?":"Безопасно ли пускать ИИ к моему ПК?",
  "Nyx never acts on its own. It shows you a plain-English plan first, and nothing runs until you approve it. A validator blocks destructive commands, NetGuard blocks unknown network access, and every action is signed to ./evidence so you can check exactly what happened.":"Nyx никогда не действует сам по себе. Сначала он показывает план понятным языком, и ничего не запускается, пока ты не подтвердишь. Валидатор блокирует разрушительные команды, NetGuard блокирует неизвестный сетевой доступ, а каждое действие подписывается в ./evidence, чтобы ты мог точно проверить, что произошло.",
  "Do I need to be technical to use it?":"Нужно ли быть технарём, чтобы этим пользоваться?",
  "Not at all. You talk to it in normal language - \"clean up my downloads\", \"why is my PC slow\", \"rename these files by date\". There are no commands to memorize.":"Совсем нет. Ты говоришь с ним обычным языком — «прибери в загрузках», «почему тормозит мой ПК», «переименуй эти файлы по дате». Никаких команд запоминать не нужно.",
  "Is it really free?":"Это правда бесплатно?",
  "Yes, and it's open source under Apache-2.0. No trial, no subscription, no upsell. You can read the code, run the verifier, and check the signed receipts yourself.":"Да, и это открытый код под Apache-2.0. Без пробного периода, без подписки, без допродаж. Ты можешь прочитать код, запустить верификатор и сам проверить подписанные чеки.",
  "How much space does it need?":"Сколько места нужно?",
  "The app itself is small (~120 MB). Each model you pick is downloaded once and stored locally - about 1 GB for the Lite tier up to about 5 GB for the Pro tier. You only ever download the models you choose.":"Само приложение маленькое (~120 МБ). Каждая выбранная модель скачивается один раз и хранится локально — примерно от 1 ГБ для уровня Lite до около 5 ГБ для уровня Pro. Ты скачиваешь только те модели, которые выбираешь."
});
(function(){
  var NK={
    "~1B params":{uk:"~1 млрд параметрів",es:"~1 mil M de parámetros",de:"~1 Mrd. Parameter",fr:"~1 Md de paramètres"},
    "~4B params":{uk:"~4 млрд параметрів",es:"~4 mil M de parámetros",de:"~4 Mrd. Parameter",fr:"~4 Md de paramètres"},
    "~8B params":{uk:"~8 млрд параметрів",es:"~8 mil M de parámetros",de:"~8 Mrd. Parameter",fr:"~8 Md de paramètres"},
    "~3B params":{uk:"~3 млрд параметрів",es:"~3 mil M de parámetros",de:"~3 Mrd. Parameter",fr:"~3 Md de paramètres"},
    "A light step up from Lite for everyday work on typical laptops.":{uk:"Легкий крок уперед від Lite для повсякденної роботи на звичайних ноутбуках.",es:"Un paso ligero por encima de Lite para el trabajo diario en portátiles típicos.",de:"Ein kleiner Schritt über Lite für die tägliche Arbeit auf typischen Laptops.",fr:"Un petit cran au-dessus de Lite pour le travail quotidien sur des portables classiques."},
    "3 GB+ RAM":{uk:"3 ГБ+ ОЗП",es:"3 GB+ de RAM",de:"3 GB+ RAM",fr:"3 Go+ de RAM"},
    "6 GB+ RAM":{uk:"6 ГБ+ ОЗП",es:"6 GB+ de RAM",de:"6 GB+ RAM",fr:"6 Go+ de RAM"},
    "8 GB+ RAM":{uk:"8 ГБ+ ОЗП",es:"8 GB+ de RAM",de:"8 GB+ RAM",fr:"8 Go+ de RAM"},
    "CPU or a basic laptop GPU":{uk:"Процесор або проста відеокарта ноутбука",es:"CPU o una GPU básica de portátil",de:"CPU oder eine einfache Laptop-GPU",fr:"CPU ou un GPU basique de portable"},
    "Balanced speed and quality":{uk:"Баланс швидкості та якості",es:"Equilibrio entre velocidad y calidad",de:"Ausgewogene Geschwindigkeit und Qualität",fr:"Équilibre entre vitesse et qualité"},
    "Everyday assistant tasks":{uk:"Щоденні задачі асистента",es:"Tareas de asistente del día a día",de:"Alltägliche Assistenzaufgaben",fr:"Tâches d'assistant du quotidien"},
    "~120 MB app + 1-5 GB per model":{uk:"застосунок ~120 МБ + 1–5 ГБ на модель",es:"app de ~120 MB + 1–5 GB por modelo",de:"~120 MB App + 1–5 GB pro Modell",fr:"app de ~120 Mo + 1–5 Go par modèle"},
    "Your model is fetched a single time (1-5 GB by tier) and stored locally. After that Nyx works with no internet at all.":{uk:"Твоя модель завантажується один раз (1–5 ГБ залежно від рівня) і зберігається локально. Після цього Nyx працює взагалі без інтернету.",es:"Tu modelo se descarga una sola vez (1–5 GB según el nivel) y se guarda localmente. Después Nyx funciona sin nada de internet.",de:"Dein Modell wird ein einziges Mal geladen (1–5 GB je nach Stufe) und lokal gespeichert. Danach läuft Nyx komplett ohne Internet.",fr:"Ton modèle est récupéré une seule fois (1–5 Go selon le niveau) et stocké localement. Ensuite Nyx fonctionne sans aucune connexion."},
    "The app itself is small (~120 MB). Each model you pick is downloaded once and stored locally - about 1 GB for the Lite tier up to about 5 GB for the Pro tier. You only ever download the models you choose.":{uk:"Сам застосунок маленький (~120 МБ). Кожна обрана модель завантажується один раз і зберігається локально — приблизно від 1 ГБ для рівня Lite до близько 5 ГБ для рівня Pro. Ти завантажуєш лише ті моделі, які обираєш.",es:"La app en sí es pequeña (~120 MB). Cada modelo que eliges se descarga una vez y se guarda localmente: más o menos 1 GB para el nivel Lite hasta unos 5 GB para el nivel Pro. Solo descargas los modelos que eliges.",de:"Die App selbst ist klein (~120 MB). Jedes Modell, das du wählst, wird einmal geladen und lokal gespeichert – etwa 1 GB für die Lite-Stufe bis rund 5 GB für die Pro-Stufe. Du lädst immer nur die Modelle, die du auswählst.",fr:"L'app elle-même est petite (~120 Mo). Chaque modèle que tu choisis est téléchargé une fois et stocké localement — environ 1 Go pour le niveau Lite jusqu'à environ 5 Go pour le niveau Pro. Tu ne télécharges que les modèles que tu choisis."}
  };
  var LS=["uk","es","de","fr"];
  Object.keys(NK).forEach(function(key){
    LS.forEach(function(l){
      NYXI[l]=NYXI[l]||{};
      if(NK[key][l]!=null) NYXI[l][key]=NK[key][l];
    });
  });
})();
