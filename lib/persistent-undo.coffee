fs = require('fs')
path = require('path')
zlib = require('zlib')

module.exports = PersistentUndo =
  config:
    undoFolder:
      order: 1
      description: "Name of folder for storing undo files (relative to the atom configDirPath)"
      type: "string"
      default: "persistent-undo"


  activate: (state) ->
    atom.workspace.observeTextEditors (editor) =>
      editor.buffer.onWillSave =>
        if editor.buffer?.file?.path?
          undoFolder = atom.config.get('persistent-undo.undoFolder')
          undoFilePath = path.join(atom.getConfigDirPath(), undoFolder, editor.buffer.file.path)
          if !fs.existsSync(path.dirname(undoFilePath))
            @mkdirParent path.dirname(undoFilePath), 0x1ed
          json = JSON.stringify(editor.buffer.historyProvider.serialize({}))
          gzipped = zlib.gzipSync(json)
          fs.writeFileSync(undoFilePath, gzipped)

      if editor.buffer?.file?.path?
        undoFolder = atom.config.get('persistent-undo.undoFolder')
        undoFilePath = path.join(atom.getConfigDirPath(), undoFolder, editor.buffer.file.path)
        if fs.existsSync(undoFilePath)
          fs.readFile undoFilePath, (error, data) ->
            throw error if error?
            gunzipped = zlib.gunzipSync(data).toString('utf8')
            state = JSON.parse(gunzipped)
            if state?
              editor.buffer.historyProvider.deserialize(state)

  deactivate: ->

  mkdirParent: (dirPath, mode) ->
    if !fs.existsSync(path.dirname(dirPath))
      @mkdirParent(path.dirname(dirPath), mode)
    fs.mkdirSync dirPath, mode
