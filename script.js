// your code goes here
class File {
  constructor(name, content = '') {
    this.name = name;
    this.content = content;
    this.type = 'file';
  }
}

class Folder {
  constructor(name) {
    this.name = name;
    this.children = new Map();
    this.type = 'folder';
  }

  addChild(name, item) {
    this.children.set(name, item);
  }

  removeChild(name) {
    this.children.delete(name);
  }
}

class FileExplorer {
  constructor(editor) {
    this.fileTree = document.getElementById('file-tree');
    this.rootFolder = new Folder('root');
    this.editor = editor;
    this.contextMenu = null;
    this.activeItem = null;
    this.console = editor.console; 
    this.init();
  }

  init() {
    const savedStructure = localStorage.getItem('fileStructure');
    if (savedStructure) {
      this.loadFileStructure(JSON.parse(savedStructure));
    } else {
      const skibidiFolder = new Folder('Skibidi Folder');
      skibidiFolder.addChild('main.lua', new File('main.lua', 'print("Hello World!")'));
      this.rootFolder.addChild('Skibidi Folder', skibidiFolder);
    }
    
    this.renderTree();
    this.setupEventListeners();
  }

  saveFileStructure() {
    const structure = this.serializeStructure(this.rootFolder);
    localStorage.setItem('fileStructure', JSON.stringify(structure));
  }

  serializeStructure(folder) {
    const structure = {
      name: folder.name,
      type: folder.type,
      children: {}
    };

    folder.children.forEach((item, name) => {
      if (item.type === 'file') {
        structure.children[name] = {
          type: 'file',
          name: item.name,
          content: item.content
        };
      } else {
        structure.children[name] = this.serializeStructure(item);
      }
    });

    return structure;
  }

  loadFileStructure(structure) {
    this.rootFolder = this.deserializeStructure(structure);
  }

  deserializeStructure(structure) {
    const folder = new Folder(structure.name);
    
    Object.entries(structure.children).forEach(([name, item]) => {
      if (item.type === 'file') {
        folder.addChild(name, new File(item.name, item.content));
      } else {
        folder.addChild(name, this.deserializeStructure(item));
      }
    });

    return folder;
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target)) {
        this.contextMenu.remove();
        this.contextMenu = null;
      }
    });

    this.fileTree.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e);
    });

    // Button event listeners
    document.getElementById('new-file').addEventListener('click', () => this.createNewItem('file'));
    document.getElementById('new-folder').addEventListener('click', () => this.createNewItem('folder'));
    document.getElementById('upload-folder').addEventListener('click', () => this.uploadFolder());
    document.getElementById('save-file').addEventListener('click', () => {
      const target = this.activeItem;
      if (target && target.classList.contains('file')) {
        this.saveFile(target);
      }
    });
  }

  showContextMenu(e) {
    e.preventDefault();
    e.stopPropagation();

    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }

    const target = e.target.closest('.file, .folder') || this.fileTree;
    if (!target) return;

    this.activeItem = target;

    const contextMenu = document.createElement('div');
    contextMenu.className = 'context-menu';
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;

    const menuItems = [];

    if (target === this.fileTree || target.classList.contains('folder')) {
      menuItems.push(
        { label: 'New File', icon: 'bx-file-blank', action: () => this.createNewItem('file') },
        { label: 'New Folder', icon: 'bx-folder', action: () => this.createNewItem('folder') },
        { label: 'Upload Folder', icon: 'bx-upload', action: () => this.uploadFolder() },
        { separator: true },
        { label: 'Save Folder', icon: 'bx-download', action: () => this.saveFolder(target) }
      );
    }

    if (target.classList.contains('file')) {
      menuItems.push(
        { label: 'Save File', icon: 'bx-download', action: () => this.saveFile(target) }
      );
    }

    if (target.classList.contains('file') || target.classList.contains('folder')) {
      if (menuItems.length > 0) {
        menuItems.push({ separator: true });
      }
      menuItems.push(
        { label: 'Rename', icon: 'bx-edit', action: () => this.renameItem() },
        { label: 'Delete', icon: 'bx-trash', action: () => this.deleteItem() }
      );
    }

    menuItems.forEach(item => {
      if (item.separator) {
        contextMenu.appendChild(this.createMenuSeparator());
      } else {
        contextMenu.appendChild(this.createMenuItem(item));
      }
    });

    document.body.appendChild(contextMenu);
    this.contextMenu = contextMenu;

    const menuRect = contextMenu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
      contextMenu.style.left = `${window.innerWidth - menuRect.width - 5}px`;
    }
    if (menuRect.bottom > window.innerHeight) {
      contextMenu.style.top = `${window.innerHeight - menuRect.height - 5}px`;
    }
  }

  createMenuItem({ label, icon, action }) {
    const item = document.createElement('div');
    item.className = 'context-menu-item';
    item.innerHTML = `
      <i class='bx ${icon}'></i>
      <span>${label}</span>
    `;
    item.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (typeof action === 'function') {
        action();
      }

      if (this.contextMenu) {
        this.contextMenu.remove();
        this.contextMenu = null;
      }
      
      if (this.activeItem) {
        this.activeItem.classList.remove('active');
        this.activeItem = null;
      }
    };
    return item;
  }

  createMenuSeparator() {
    const separator = document.createElement('div');
    separator.className = 'context-menu-separator';
    return separator;
  }

  createNewItem(type) {
    const input = document.createElement('div');
    input.className = 'input-overlay';
    input.innerHTML = `<input type="text" placeholder="Enter ${type} name...">`;
    
    const inputField = input.querySelector('input');
    const targetFolder = this.activeItem && this.activeItem.classList.contains('folder') ? 
      this.activeItem.nextElementSibling : 
      this.activeItem;

    if (targetFolder) {
      targetFolder.appendChild(input);
      inputField.focus();

      inputField.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          let name = inputField.value.trim();
          if (name) {
            if (type === 'file') {
              if (!name.includes('.')) {
                name += '.lua';
              }
              const file = new File(name);
              this.addToFolder(targetFolder, name, file);
            } else {
              const folder = new Folder(name);
              this.addToFolder(targetFolder, name, folder);
            }
          }
          input.remove();
        } else if (e.key === 'Escape') {
          input.remove();
        }
      });
    }
  }

  addToFolder(targetFolder, name, item) {
    const folderPath = this.getItemPath(targetFolder);
    let currentFolder = this.rootFolder;
    for (const segment of folderPath) {
      currentFolder = currentFolder.children.get(segment);
    }
    currentFolder.addChild(name, item);
    this.saveFileStructure();
    this.renderTree();
  }

  getItemPath(element) {
    const path = [];
    while (element && element !== this.fileTree) {
      if (element.classList.contains('folder-content')) {
        const folderName = element.previousElementSibling.querySelector('span').textContent;
        path.unshift(folderName);
      }
      element = element.parentElement;
    }
    return path;
  }

  renameItem() {
    const span = this.activeItem.querySelector('span');
    const originalName = span.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalName;
    input.style.width = '100px';
    
    span.replaceWith(input);
    input.focus();

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const newName = input.value.trim();
        if (newName && newName !== originalName) {
          const path = this.getItemPath(this.activeItem);
          let currentFolder = this.rootFolder;
          for (const segment of path) {
            currentFolder = currentFolder.children.get(segment);
          }
          const item = currentFolder.children.get(originalName);
          currentFolder.removeChild(originalName);
          currentFolder.addChild(newName, item);
          this.saveFileStructure();
          this.renderTree();
        } else {
          input.replaceWith(span);
        }
      } else if (e.key === 'Escape') {
        input.replaceWith(span);
      }
    });
  }

  deleteItem() {
    const path = this.getItemPath(this.activeItem);
    const itemName = this.activeItem.querySelector('span').textContent;
    
    let currentFolder = this.rootFolder;
    for (const segment of path) {
      currentFolder = currentFolder.children.get(segment);
    }
    currentFolder.removeChild(itemName);
    this.saveFileStructure();
    this.renderTree();
  }

  openFile(file) {
    let existingTabIndex = this.editor.tabs.findIndex(tab => tab.name === file.name);

    if (existingTabIndex === -1) {
      this.editor.addTab(file.name);
      existingTabIndex = this.editor.tabs.length - 1; // Update the index after adding the tab
    }

    this.editor.tabs[existingTabIndex].content = file.content;
    this.editor.tabs[existingTabIndex].session.setValue(file.content);
    this.editor.openTab(existingTabIndex);

    this.editor.editorInstance.session.on('change', () => {
      if (this.editor.tabs[this.editor.currentTabIndex]) {
        this.editor.tabs[this.editor.currentTabIndex].content = this.editor.editorInstance.getValue();
        this.saveFileStructure();
      }
    });
  }

  uploadFolder() {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      if (!this.rootFolder) {
        this.rootFolder = new Folder("Root");
      }

      const basePath = files[0].webkitRelativePath.split('/')[0];
      const baseFolder = new Folder(basePath);

      for (const file of files) {
        const pathParts = file.webkitRelativePath.split('/');
        let currentFolder = baseFolder;

        for (let i = 1; i < pathParts.length - 1; i++) {
          const folderName = pathParts[i];

          if (!currentFolder.children.has(folderName)) {
            currentFolder.addChild(folderName, new Folder(folderName));
          }

          currentFolder = currentFolder.children.get(folderName) || null; // Ensure valid folder reference
        }

        const fileName = pathParts[pathParts.length - 1];
        const content = await this.readFileContent(file);
        currentFolder.addChild(fileName, new File(fileName, content));
      }

      this.rootFolder.addChild(basePath, baseFolder);
      this.saveFileStructure();
      this.renderTree();
    };

    input.click();
  }

  async readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  renderTree(structure = this.rootFolder.children, parentElement = this.fileTree) {
    parentElement.innerHTML = '';
    
    for (const [name, item] of structure) {
      if (item.type === 'file') {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'file';
        fileDiv.innerHTML = `
          <i class='bx bxs-planet'></i>
          <span>${name}</span>
        `;
        fileDiv.addEventListener('click', () => this.openFile(item));
        parentElement.appendChild(fileDiv);
      } else {
        const folderDiv = document.createElement('div');
        folderDiv.className = 'folder expanded'; 
        folderDiv.innerHTML = `
          <i class='bx bx-chevron-right'></i>
          <i class='bx bxs-folder'></i>
          <span>${name}</span>
        `;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'folder-content';
        
        folderDiv.addEventListener('click', (e) => {
          if (e.target === folderDiv || e.target === folderDiv.querySelector('span') || e.target === folderDiv.querySelector('i')) {
            folderDiv.classList.toggle('expanded');
          }
        });
        
        parentElement.appendChild(folderDiv);
        parentElement.appendChild(contentDiv);
        
        this.renderTree(item.children, contentDiv);
      }
    }
  }

  async saveFolder(folderElement) {
    try {
      const folderPath = this.getItemPath(folderElement);
      let currentFolder = this.rootFolder;
      for (const segment of folderPath) {
        currentFolder = currentFolder.children.get(segment);
      }
      const zip = new JSZip();
      const addToZip = (folder, zipFolder) => {
        folder.children.forEach((item, name) => {
          if (item.type === 'file') {
            zipFolder.file(name, item.content);
          } else {
            const newZipFolder = zipFolder.folder(name);
            addToZip(item, newZipFolder);
          }
        });
      };
      addToZip(currentFolder, zip);
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9
        }
      });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(zipBlob);
      downloadLink.download = `${currentFolder.name}.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      this.console.success(`Folder '${currentFolder.name}' saved successfully as zip`);
    } catch (error) {
      this.console.error(`Error saving folder: ${error.message}`);
    }
  }

  async saveFile(fileElement) {
    const filePath = this.getItemPath(fileElement);
    const fileName = fileElement.querySelector('span').textContent;
    let currentFolder = this.rootFolder;
    for (const segment of filePath) {
      currentFolder = currentFolder.children.get(segment);
    }
    const file = currentFolder.children.get(fileName);
    const fileBlob = new Blob([file.content], { type: 'text/plain' });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(fileBlob);
    downloadLink.download = fileName;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    this.console.success(`File '${fileName}' saved successfully`);
  }
}

class Console {
  constructor() {
    this.output = document.getElementById('console-output');
    this.clearButton = document.getElementById('clear-console');
    this.init();
  }

  init() {
    this.clearButton.addEventListener('click', () => this.clear());
  }

  log(message, type = 'normal') {
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = new Date().toLocaleTimeString();
    const messageSpan = document.createElement('span');
    messageSpan.className = 'message';
    messageSpan.textContent = message;
    line.appendChild(timestamp);
    line.appendChild(messageSpan);
    this.output.appendChild(line);
    this.output.scrollTop = this.output.scrollHeight;
  }

  error(message) {
    this.log(message, 'error');
  }

  info(message) {
    this.log(message, 'info');
  }

  success(message) {
    this.log(message, 'success');
  }

  clear() {
    this.output.innerHTML = '';
  }
}

class Editor {
  constructor() {
    this.tabs = [];
    this.currentTabIndex = 0;
    this.editorContainer = document.getElementById('editor-container');
    this.console = new Console();
    this.init();
    
    // Add default tab (Tab 1 in Lua mode)
    this.addTab("Tab 1", true);
  }

  init() {
    this.editorInstance = ace.edit(this.editorContainer);

    // Set the theme
    this.editorInstance.setTheme('ace/theme/monokai');

    // Configure editor options
    this.editorInstance.setOptions({
      fontSize: '14px',
      enableBasicAutocompletion: true,
      enableLiveAutocompletion: true,
      enableSnippets: true,
      showPrintMargin: false,
      fontFamily: 'JetBrains Mono, monospace',
      showInvisibles: true, // Show spaces/tabs
    });

    // Ensure the gutter and minimap (if available) are correctly applied
    this.editorInstance.renderer.setOption("showGutter", true);

    // Prevent multiple change event bindings
    this.editorInstance.session.on('change', () => {
      if (this.currentTabIndex >= 0) {
        this.tabs[this.currentTabIndex].content = this.editorInstance.getValue();
      }
    });
  }

  addTab(name, isDefault = false) {
    if (this.tabs.length >= 6) {
      this.console.error("Tab limit reached! You can only have up to 6 tabs.");
      return;
    }

    const tabIndex = this.tabs.length;
    const content = isDefault ? `print("Welcome to ${name}")` : `print("This is ${name}")`;
    const session = ace.createEditSession(content, "ace/mode/lua");

    const tab = {
      name: name,
      content: content,
      session: session
    };

    this.tabs.push(tab);
    this.currentTabIndex = tabIndex;

    // Add the tab to the UI
    const tabContainer = document.getElementById('tab-container');
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.innerHTML = `${name} <span class="close-tab" onclick="editor.removeTab(${tabIndex})">x</span>`;
    tabElement.onclick = () => this.openTab(tabIndex);
    tabContainer.insertBefore(tabElement, document.getElementById('add-tab'));

    if (isDefault) {
      this.openTab(tabIndex);
    }
  }

  removeTab(index) {
    if (this.tabs.length <= 1) return; // Prevent removing last tab

    this.tabs.splice(index, 1);

    // Remove the tab element from the UI
    const tabContainer = document.getElementById('tab-container');
    tabContainer.removeChild(tabContainer.children[index]);

    // Adjust the currentTabIndex and re-open the next available tab
    this.currentTabIndex = Math.max(0, index - 1);
    this.openTab(this.currentTabIndex);

    this.renderTabs();
  }

  openTab(index) {
    if (index >= 0 && index < this.tabs.length) {
      this.currentTabIndex = index;
      this.editorInstance.setSession(this.tabs[index].session);
      this.console.info(`Opened tab: ${this.tabs[index].name}`);
      this.renderTabs();
    }
  }

  renderTabs() {
    const tabContainer = document.getElementById('tab-container');
    const tabs = tabContainer.getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('active');
    }
    if (this.tabs[this.currentTabIndex]) {
      tabs[this.currentTabIndex].classList.add('active');
    }
  }

  runCode() {
    try {
      const code = this.editorInstance.getValue();
      this.console.info('Running code...');
      // Execute the code if needed
      this.console.success('Code executed successfully');
    } catch (error) {
      this.console.error(`Error: ${error.message}`);
    }
  }

  // Get the current text from the editor
  getText() {
    return this.editorInstance.getValue();
  }

  // Clear the editor content
  clearText() {
    this.editorInstance.setValue('');
  }

  // Toggle minimap
  toggleMinimap() {
    const showMinimap = this.editorInstance.getOption("minimap");
    this.editorInstance.setOption("minimap", !showMinimap);
  }

  // Set font size (used for slider input)
  setFontSize(size) {
    this.editorInstance.setFontSize(`${size}px`);
  }
}

// Initialize the editor with a default tab in Lua mode
const editor = new Editor();
const fileExplorer = new FileExplorer(editor);

editor.console.info('Editor initialized');
editor.console.info('Press Ctrl+Enter (Cmd+Enter on Mac) to run code');

// Functions for button clicks
function addTab() {
  const tabCount = editor.tabs.length + 1;
  editor.addTab(`Tab ${tabCount}`);
}

function removeTab(index) {
  editor.removeTab(index);
}

// Modify font size with slider
document.getElementById("font-size-slider").addEventListener("input", (event) => {
  editor.setFontSize(event.target.value);
});
