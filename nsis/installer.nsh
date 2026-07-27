!include LogicLib.nsh
!include nsDialogs.nsh

!ifdef BUILD_UNINSTALLER

Var ModelCheckbox
Var ModelState
Var DataCheckbox
Var DataState

!macro customUnWelcomePage
  UninstPage custom un.NyxCleanupShow un.NyxCleanupLeave
!macroend

Function un.NyxCleanupShow
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 20u "Nyx будет удалён. Ниже выберите, что убрать дополнительно."
  Pop $0

  ${NSD_CreateCheckbox} 0 26u 100% 12u "Удалить скачанную модель (можно скачать заново в любой момент)"
  Pop $ModelCheckbox
  ${NSD_Check} $ModelCheckbox

  ${NSD_CreateCheckbox} 0 44u 100% 12u "Удалить мои личные данные: чаты, доказательства (evidence), ключи"
  Pop $DataCheckbox

  ${NSD_CreateLabel} 0 64u 100% 44u "Личные данные важные и невосстановимые — это ваши разговоры, локальные доказательства и подписи. По умолчанию они СОХРАНЯЮТСЯ и удаляются только если отметить галочку выше — не сразу и не полностью. Модель — просто скачанный файл, её безопасно удалить и вернуть позже. Папка: $INSTDIR"
  Pop $0

  nsDialogs::Show
FunctionEnd

Function un.NyxCleanupLeave
  ${NSD_GetState} $ModelCheckbox $ModelState
  ${NSD_GetState} $DataCheckbox $DataState
FunctionEnd

!macro customRemoveFiles
  CreateDirectory "$INSTDIR\..\NyxKeep"

  ${IfNot} $DataState == 1
    Rename "$INSTDIR\evidence" "$INSTDIR\..\NyxKeep\evidence"
    Rename "$INSTDIR\data" "$INSTDIR\..\NyxKeep\data"
    Rename "$INSTDIR\.poli.key" "$INSTDIR\..\NyxKeep\poli.key"
    Rename "$INSTDIR\.poli.pub" "$INSTDIR\..\NyxKeep\poli.pub"
  ${EndIf}

  ${IfNot} $ModelState == 1
    Rename "$INSTDIR\Models" "$INSTDIR\..\NyxKeep\Models"
  ${EndIf}

  RMDir /r "$INSTDIR"
  CreateDirectory "$INSTDIR"

  ${IfNot} $DataState == 1
    Rename "$INSTDIR\..\NyxKeep\evidence" "$INSTDIR\evidence"
    Rename "$INSTDIR\..\NyxKeep\data" "$INSTDIR\data"
    Rename "$INSTDIR\..\NyxKeep\poli.key" "$INSTDIR\.poli.key"
    Rename "$INSTDIR\..\NyxKeep\poli.pub" "$INSTDIR\.poli.pub"
  ${EndIf}
  ${IfNot} $ModelState == 1
    Rename "$INSTDIR\..\NyxKeep\Models" "$INSTDIR\Models"
  ${EndIf}

  RMDir "$INSTDIR\..\NyxKeep"
  RMDir "$INSTDIR"
!macroend

!else

!macro customUnWelcomePage
!macroend

!macro customRemoveFiles
!macroend

!endif
