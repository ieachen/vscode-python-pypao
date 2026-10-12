# PyPao

A VS Code extension providing Python/IPython utilities with a convenient context menu.

## Features

Right-click anywhere inside a Python file to access the **PyPao** submenu with the following commands:

### Context Menu Position

- A submenu called "PyPao" appears at the top of the right-click context menu
- Positioned using the group `1_pypao@1` for easy access
- Only appears when right-clicking inside Python files

### 1. New "ipython" terminal

Opens a terminal and starts IPython using the virtual environment. The session remains open without running any file, ready for interactive Python coding.

- Location: `pyPao.createIpython`
- Pure interactive IPython session

### 2. New "ipython --matplotlib" terminal

Same as above but adds `--matplotlib` flag for interactive plotting support.

- Location: `pyPao.createIpythonMatplotlib`

### 3. "python" run file

Runs the current Python file using `python xxx.py` with the virtual environment activated.

- Location: `pyPao.runPython`
- Detects the Python interpreter selected via the **Python** extension
- Activates the virtual environment (venv/virtualenv or conda)
- Runs the file and exits after completion

### 4. "ipython" run file

Runs the current Python file using `ipython xxx.py` (without the `-i` flag) with the virtual environment activated.

- Location: `pyPao.runIpython`
- Executes the file in IPython and exits after completion
- Does not leave you in an interactive session

### 5. "ipython -i" run file

Runs the current Python file in IPython with the `-i` flag, leaving you in an interactive session. Mimics PyCharm's **"Run File in Python Console"**.

- Location: `pyPao.run`
- Opens a new integrated terminal
- Detects and activates the Python interpreter's virtual environment
- Runs: `ipython -i /path/to/your_file.py` (absolute path)
- Leaves the IPython session open for interactive exploration

### 6. "ipython -i --matplotlib" run file

Same as above but adds `--matplotlib` flag for interactive plotting with matplotlib.

- Location: `pyPao.runMatplotlib`
- Useful for interactive data visualization

### 7. Copy import

Generates and copies an import statement to the clipboard based on the current file's location relative to the workspace root.

**Enhanced with text selection support:**

- **When text is selected:** Copies `from dir1.dir2.this_file import selected_text`
- **When no text is selected:** Copies `from dir1.dir2.this_file import ` (ready for you to complete)

For example, if your file is at:
```
${workspaceFolder}/dir1/dir2/this_file.py
```

And you have selected the text `MyClass`, it will copy:
```python
from dir1.dir2.this_file import MyClass
```

If nothing is selected, it will copy:
```python
from dir1.dir2.this_file import 
```

This always starts from the workspace root (does not look for `__init__.py` files), making it easy to complete the import statement or delete parts as needed.

- Copies to clipboard with confirmation message
- Location: `pyPao.copyImport`

### 8. List and delete __pycache__

- Recursively finds all `__pycache__` directories and `.pyc`/`.pyo` files
- Shows a modal dialog listing all items found
- Deletes only after user confirmation
- Implemented in pure TypeScript (no bash commands needed)
- Location: `pyPao.deletePycache`

## Requirements

- The [Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python)
  installed and an interpreter selected (`Python: Select Interpreter`).
- `ipython` installed in that environment (`pip install ipython` or `conda install ipython`).

The extension supports both regular virtual environments (venv, virtualenv) and conda environments.

If the Python extension isn't installed, or no venv/conda environment can be located next to
the selected interpreter, the extension falls back to running plain
commands on your `PATH` and shows a warning so you know to check your environment.

## Usage

### Context Menu (Right-click)

Right-click anywhere inside a `.py` file's editor (including empty space
below the code) → **PyPao** → select a command.

The **PyPao** submenu appears at the top of the context menu for quick access.

### Command Palette

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) to open the Command Palette, then type commands:

- **New "ipython" terminal**
- **New "ipython --matplotlib" terminal**
- **"python" run file**
- **"ipython" run file**
- **"ipython -i" run file**
- **"ipython -i --matplotlib" run file**
- **Copy import**
- **List and delete __pycache__**

### Why not add commands/sub-menus to VSCode right top "Terminal" menu?

Due to VS Code extension API limitations, custom commands cannot be added directly to the top Terminal menu. 
They are available through the Command Palette described above. 
Or you can optionally bind keyboard shortcuts to these commands for fast access.

Bind keyboard shortcuts to these commands:

1. Go to File → Preferences → Keyboard Shortcuts (or `Ctrl+K Ctrl+S`)
2. Search for commands `"ipython" run file`
3. Click the + icon to add your preferred keybinding

## Building / Packaging

```bash
npm install
npm run compile
npx vsce package
```

This produces a `.vsix` you can install via
**Extensions view → "..." menu → Install from VSIX...**.

You can also package on GitHub without running those commands locally. The
**Package VSIX** workflow (`.github/workflows/package-vsix.yml`) is manual
only — it does not run on every push.

1. Open the repo on GitHub → **Actions** → **Package VSIX**
2. Click **Run workflow**
3. After it finishes, open the run and download the `pypao-vsix` artifact
4. Install the `.vsix` the same way as above

## Testing Recommendations

To test the extension:

1. Press F5 to launch Extension Development Host
2. Open a Python workspace with a virtual environment configured
3. **Test Quick Terminal Commands:**
   - Press `Ctrl+Shift+P` to open Command Palette
   - Type `New "ipython" terminal` and press Enter
   - Verify IPython opens with venv activated
   - Repeat for `New "ipython --matplotlib" terminal`
4. **Test Context Menu Commands:**
   - Open a Python file in the test workspace
   - Right-click anywhere in the file
   - Verify the "PyPao" submenu appears at the top
5. Test each of the 8 context menu commands:
   - **New "ipython" terminal** (should open IPython without running a file)
   - **New "ipython --matplotlib" terminal** (should open IPython with matplotlib)
   - **"python" run file** (should run the file with python and exit)
   - **"ipython" run file** (should run the file with ipython and exit)
   - **"ipython -i" run file** (should run the file and leave you in IPython)
   - **"ipython -i --matplotlib" run file** (should add matplotlib support)
   - **Copy import** (should copy import statement, with selected text if any)
   - **List and delete __pycache__** (should find and offer to delete cache files)
