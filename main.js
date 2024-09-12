const { Plugin, Notice, Modal } = require("obsidian");

module.exports = class RemoveTagsPlugin extends Plugin {
  async onload() {
    console.log("Cargando el plugin de eliminar tags...");

    // Comando para eliminar tags de un archivo individual
    this.addCommand({
      id: "remove-tags-from-file",
      name: "Eliminar tags de un archivo",
      checkCallback: (checking) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) return false;

        if (!checking) {
          this.promptForTag((tagToRemove) => {
            if (tagToRemove) {
              this.removeTagFromFile(activeFile, tagToRemove, true);
            }
          });
        }

        return true;
      },
    });

    // Comando para eliminar tags de una carpeta
    this.addCommand({
      id: "remove-tags-from-folder",
      name: "Eliminar tags de una carpeta",
      checkCallback: (checking) => {
        const activeFolder = this.app.vault.getAbstractFileByPath(
          this.app.fileManager.getNewFileParent("").path
        );
        if (!activeFolder || !activeFolder.children) return false;

        if (!checking) {
          this.promptForTag((tagToRemove) => {
            if (tagToRemove) {
              this.removeTagsFromFolder(activeFolder, tagToRemove);
            }
          });
        }

        return true;
      },
    });

    // Comando para eliminar tags de todos los archivos en la vault
    this.addCommand({
      id: "remove-tags-from-vault",
      name: "Eliminar tags de todos los archivos en la vault",
      checkCallback: (checking) => {
        if (!checking) {
          this.promptForTag((tagToRemove) => {
            if (tagToRemove) {
              this.removeTagsFromVault(tagToRemove);
            }
          });
        }

        return true;
      },
    });
  }

  // Función que muestra un prompt al usuario para que ingrese el tag
  promptForTag(callback) {
    const promptModal = new PromptModal(
      this.app,
      "Ingrese el tag a eliminar",
      callback
    );
    promptModal.open();
  }

  // Función para eliminar un tag específico de un archivo
  async removeTagFromFile(file, tag, aviso) {
    const fileContent = await this.app.vault.read(file);

    // Crear una expresión regular para buscar el tag exacto
    const tagRegex = new RegExp(`(^|\n)${tag}(\\s|\n|$)`, "g");

    // Reemplazar todas las ocurrencias del tag por una línea vacía
    const updatedContent = fileContent.replace(tagRegex, "\n").trim();

    if (updatedContent !== fileContent) {
      await this.app.vault.modify(file, updatedContent);
      if (aviso) {
        new Notice(`Tag ${tag} eliminado del archivo ${file.name}`);
      }
    } else {
      if (aviso) {
        new Notice(`El tag ${tag} no se encontró en el archivo ${file.name}`);
      }
    }
  }

  // Función para eliminar tags de todos los archivos en una carpeta y subcarpetas
  async removeTagsFromFolder(folder, tag) {
    const files = folder.children;

    for (const child of files) {
      if (child.children) {
        // Si es una subcarpeta, procesarla recursivamente
        await this.removeTagsFromFolder(child, tag);
      } else if (child.extension === "md") {
        // Si es un archivo .md, eliminar el tag
        await this.removeTagFromFile(child, tag, false);
      }
    }

    new Notice(`Tag ${tag} eliminado de todos los archivos en ${folder.name}`);
  }

  // Función para eliminar tags de todos los archivos .md en la vault
  async removeTagsFromVault(tag) {
    const allFiles = this.app.vault.getFiles();

    for (const file of allFiles) {
      if (file.extension === "md") {
        await this.removeTagFromFile(file, tag, false);
      }
    }

    new Notice(`Tag ${tag} eliminado de todos los archivos en la vault.`);
  }

  onunload() {
    console.log("Descargando el plugin de eliminar tags...");
  }
};

// Clase para crear un modal que permita pedir el tag al usuario
class PromptModal extends Modal {
  constructor(app, promptText, callback) {
    super(app);
    this.promptText = promptText;
    this.callback = callback;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl("h2", { text: this.promptText });

    const inputEl = contentEl.createEl("input", {
      type: "text",
      placeholder: "Ej: #miTag",
    });

    const submitButton = contentEl.createEl("button", { text: "Eliminar Tag" });

    submitButton.onclick = () => {
      const tagValue = inputEl.value.trim();
      if (tagValue) {
        this.callback(tagValue);
        this.close();
      } else {
        new Notice("Por favor, ingrese un tag válido.");
      }
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
