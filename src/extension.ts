import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

const TERMINAL_PREFIX = 'IPython';

export function activate(context: vscode.ExtensionContext) {
  // Command 1: Run file with python
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'pyPao.runPython',
      async (uri?: vscode.Uri) => {
        try {
          await runFileWithPython(uri);
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Run file with python failed: ${err?.message ?? err}`
          );
        }
      }
    )
  );

  // Command 2: Run file with ipython
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'pyPao.runIpython',
      async (uri?: vscode.Uri) => {
        try {
          await runFileWithIpython(uri);
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Run file with ipython failed: ${err?.message ?? err}`
          );
        }
      }
    )
  );

  // Command 3: Run file with ipython -i
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'pyPao.run',
      async (uri?: vscode.Uri) => {
        try {
          await runFileInVenvIpython(uri, []);
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Run file with ipython -i failed: ${err?.message ?? err}`
          );
        }
      }
    )
  );

  // Command 4: Run file with ipython -i --matplotlib
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'pyPao.runMatplotlib',
      async (uri?: vscode.Uri) => {
        try {
          await runFileInVenvIpython(uri, ['--matplotlib']);
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Run file with ipython -i --matplotlib failed: ${err?.message ?? err}`
          );
        }
      }
    )
  );

  // Command 5: Create session ipython
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'pyPao.createIpython',
      async (uri?: vscode.Uri) => {
        try {
          await startIpython(uri, []);
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Create session ipython failed: ${err?.message ?? err}`
          );
        }
      }
    )
  );

  // Command 6: Create session ipython --matplotlib
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'pyPao.createIpythonMatplotlib',
      async (uri?: vscode.Uri) => {
        try {
          await startIpython(uri, ['--matplotlib']);
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Create session ipython --matplotlib failed: ${err?.message ?? err}`
          );
        }
      }
    )
  );

  // Command 7: Copy import
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'pyPao.copyImport',
      async (uri?: vscode.Uri) => {
        try {
          await copyImportStatement(uri);
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Copy import failed: ${err?.message ?? err}`
          );
        }
      }
    )
  );

  // Command 8: List and delete __pycache__
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'pyPao.deletePycache',
      async () => {
        try {
          await listAndDeletePycache();
        } catch (err: any) {
          vscode.window.showErrorMessage(
            `Delete __pycache__ failed: ${err?.message ?? err}`
          );
        }
      }
    )
  );
}

export function deactivate() {}

async function runFileWithPython(uri?: vscode.Uri): Promise<void> {
  const fileUri = resolveTargetUri(uri);
  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file to run.');
    return;
  }

  if (path.extname(fileUri.fsPath) !== '.py') {
    vscode.window.showErrorMessage('Run file with python only supports .py files.');
    return;
  }

  // Save the file first so Python runs the latest content.
  const doc = vscode.workspace.textDocuments.find(
    (d) => d.uri.fsPath === fileUri.fsPath
  );
  if (doc && doc.isDirty) {
    await doc.save();
  }

  const interpreterPath = await getPythonInterpreterPath(fileUri);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
  const cwd = workspaceFolder?.uri.fsPath ?? path.dirname(fileUri.fsPath);

  const terminal = getOrCreateTerminal(fileUri, cwd);
  terminal.show(true);

  // Activate the venv (if we found one tied to the interpreter), then launch python.
  const venvRoot = interpreterPath ? findVenvRoot(interpreterPath) : undefined;

  if (venvRoot) {
    const activateCmd = buildActivationCommand(venvRoot);
    if (activateCmd) {
      terminal.sendText(activateCmd, true);
    }
  } else if (interpreterPath) {
    vscode.window.showWarningMessage(
      `Run file with python: could not locate a venv activation script near "${interpreterPath}". ` +
        `Launching python on PATH instead - make sure the right environment is active.`
    );
  } else {
    vscode.window.showWarningMessage(
      'Run file with python: no Python interpreter found via the Python extension. ' +
        'Launching plain "python" - make sure the right environment is active, or select an interpreter with ' +
        'the "Python: Select Interpreter" command.'
    );
  }

  const filePath = fileUri.fsPath;
  const pythonCmd = `python "${filePath}"`;
  terminal.sendText(pythonCmd, true);
}

async function runFileWithIpython(uri?: vscode.Uri): Promise<void> {
  const fileUri = resolveTargetUri(uri);
  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file to run.');
    return;
  }

  if (path.extname(fileUri.fsPath) !== '.py') {
    vscode.window.showErrorMessage('Run file with ipython only supports .py files.');
    return;
  }

  // Save the file first so IPython runs the latest content.
  const doc = vscode.workspace.textDocuments.find(
    (d) => d.uri.fsPath === fileUri.fsPath
  );
  if (doc && doc.isDirty) {
    await doc.save();
  }

  const interpreterPath = await getPythonInterpreterPath(fileUri);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
  const cwd = workspaceFolder?.uri.fsPath ?? path.dirname(fileUri.fsPath);

  const terminal = getOrCreateTerminal(fileUri, cwd);
  terminal.show(true);

  // Activate the venv (if we found one tied to the interpreter), then launch ipython.
  const venvRoot = interpreterPath ? findVenvRoot(interpreterPath) : undefined;

  if (venvRoot) {
    const activateCmd = buildActivationCommand(venvRoot);
    if (activateCmd) {
      terminal.sendText(activateCmd, true);
    }
  } else if (interpreterPath) {
    vscode.window.showWarningMessage(
      `Run file with ipython: could not locate a venv activation script near "${interpreterPath}". ` +
        `Launching ipython on PATH instead - make sure the right environment is active.`
    );
  } else {
    vscode.window.showWarningMessage(
      'Run file with ipython: no Python interpreter found via the Python extension. ' +
        'Launching plain "ipython" - make sure the right environment is active, or select an interpreter with ' +
        'the "Python: Select Interpreter" command.'
    );
  }

  const filePath = fileUri.fsPath;
  const ipythonCmd = `ipython "${filePath}"`;
  terminal.sendText(ipythonCmd, true);
}


async function runFileInVenvIpython(uri?: vscode.Uri, additionalArgs: string[] = []): Promise<void> {
  const fileUri = resolveTargetUri(uri);
  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file to run.');
    return;
  }

  if (path.extname(fileUri.fsPath) !== '.py') {
    vscode.window.showErrorMessage('Run file with ipython -i only supports .py files.');
    return;
  }

  // Save the file first so IPython runs the latest content.
  const doc = vscode.workspace.textDocuments.find(
    (d) => d.uri.fsPath === fileUri.fsPath
  );
  if (doc && doc.isDirty) {
    await doc.save();
  }

  const interpreterPath = await getPythonInterpreterPath(fileUri);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
  const cwd = workspaceFolder?.uri.fsPath ?? path.dirname(fileUri.fsPath);

  const terminal = getOrCreateTerminal(fileUri, cwd);
  terminal.show(true);

  // Activate the venv (if we found one tied to the interpreter), then launch ipython.
  const venvRoot = interpreterPath ? findVenvRoot(interpreterPath) : undefined;

  if (venvRoot) {
    const activateCmd = buildActivationCommand(venvRoot);
    if (activateCmd) {
      terminal.sendText(activateCmd, true);
    }
  } else if (interpreterPath) {
    vscode.window.showWarningMessage(
      `Run file with ipython -i: could not locate a venv activation script near "${interpreterPath}". ` +
        `Launching ipython on PATH instead - make sure the right environment is active.`
    );
  } else {
    vscode.window.showWarningMessage(
      'Run file with ipython -i: no Python interpreter found via the Python extension. ' +
        'Launching plain "ipython" - make sure the right environment is active, or select an interpreter with ' +
        'the "Python: Select Interpreter" command.'
    );
  }

  const filePath = fileUri.fsPath;
  const ipythonCmd = buildIpythonCommand(additionalArgs, filePath);
  terminal.sendText(ipythonCmd, true);
}

async function startIpython(uri?: vscode.Uri, additionalArgs: string[] = []): Promise<void> {
  const fileUri = resolveTargetUri(uri);
  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file context found.');
    return;
  }

  const interpreterPath = await getPythonInterpreterPath(fileUri);
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
  const cwd = workspaceFolder?.uri.fsPath ?? path.dirname(fileUri.fsPath);

  const terminal = getOrCreateTerminal(fileUri, cwd, 'IPython-Interactive');
  terminal.show(true);

  // Activate the venv (if we found one tied to the interpreter), then launch ipython.
  const venvRoot = interpreterPath ? findVenvRoot(interpreterPath) : undefined;

  if (venvRoot) {
    const activateCmd = buildActivationCommand(venvRoot);
    if (activateCmd) {
      terminal.sendText(activateCmd, true);
    }
  } else if (interpreterPath) {
    vscode.window.showWarningMessage(
      `Create session ipython: could not locate a venv activation script near "${interpreterPath}". ` +
        `Launching ipython on PATH instead.`
    );
  } else {
    vscode.window.showWarningMessage(
      'Create session ipython: no Python interpreter found via the Python extension. ' +
        'Launching plain "ipython".'
    );
  }

  const argsStr = additionalArgs.map((a) => quoteIfNeeded(a)).join(' ');
  const ipythonCmd = argsStr ? `ipython ${argsStr}` : 'ipython';
  terminal.sendText(ipythonCmd, true);
}

async function copyImportStatement(uri?: vscode.Uri): Promise<void> {
  const fileUri = resolveTargetUri(uri);
  if (!fileUri) {
    vscode.window.showErrorMessage('No Python file to generate import for.');
    return;
  }

  if (path.extname(fileUri.fsPath) !== '.py') {
    vscode.window.showErrorMessage('Copy import only works with .py files.');
    return;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(fileUri);
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('File is not in a workspace folder.');
    return;
  }

  const workspacePath = workspaceFolder.uri.fsPath;
  const filePath = fileUri.fsPath;

  // Get relative path from workspace root
  let relativePath = path.relative(workspacePath, filePath);
  
  // Remove .py extension
  if (relativePath.endsWith('.py')) {
    relativePath = relativePath.slice(0, -3);
  }

  // Convert path separators to dots
  const importPath = relativePath.split(path.sep).join('.');

  // Check if there's a text selection
  const activeEditor = vscode.window.activeTextEditor;
  let selectedText = '';
  
  if (activeEditor && activeEditor.document.uri.fsPath === fileUri.fsPath) {
    const selection = activeEditor.selection;
    if (!selection.isEmpty) {
      selectedText = activeEditor.document.getText(selection).trim();
    }
  }

  // Build the import statement
  const importStatement = selectedText 
    ? `from ${importPath} import ${selectedText}`
    : `from ${importPath} import `;

  // Copy to clipboard
  await vscode.env.clipboard.writeText(importStatement);
  vscode.window.showInformationMessage(`Copied to clipboard: ${importStatement}`);
}

async function listAndDeletePycache(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder open.');
    return;
  }

  // Find all __pycache__ directories and .pyc/.pyo files
  const pycacheItems: string[] = [];
  
  for (const folder of workspaceFolders) {
    const items = await findPycacheItems(folder.uri.fsPath);
    pycacheItems.push(...items);
  }

  if (pycacheItems.length === 0) {
    vscode.window.showInformationMessage('No __pycache__ directories or .pyc/.pyo files found.');
    return;
  }

  // Show items to user
  const itemList = pycacheItems.map(item => `  - ${item}`).join('\n');

  const choice = await vscode.window.showWarningMessage(
    `Found ${pycacheItems.length} __pycache__ directories and .pyc/.pyo files.`,
    { modal: true, detail: itemList },
    'Delete All',
    'Cancel'
  );

  if (choice === 'Delete All') {
    let deletedCount = 0;
    for (const item of pycacheItems) {
      try {
        await deleteRecursive(item);
        deletedCount++;
      } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to delete ${item}: ${err?.message ?? err}`);
      }
    }
    vscode.window.showInformationMessage(`Deleted ${deletedCount} item(s).`);
  }
}

async function findPycacheItems(rootPath: string): Promise<string[]> {
  const items: string[] = [];

  async function walk(dir: string) {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return; // Skip directories we can't read
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === '__pycache__') {
          items.push(fullPath);
          // Don't recurse into __pycache__ directories
        } else {
          await walk(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.pyc') || entry.name.endsWith('.pyo'))) {
        items.push(fullPath);
      }
    }
  }

  await walk(rootPath);
  return items;
}

async function deleteRecursive(itemPath: string): Promise<void> {
  const stats = await fs.promises.stat(itemPath);
  
  if (stats.isDirectory()) {
    const entries = await fs.promises.readdir(itemPath);
    for (const entry of entries) {
      await deleteRecursive(path.join(itemPath, entry));
    }
    await fs.promises.rmdir(itemPath);
  } else {
    await fs.promises.unlink(itemPath);
  }
}

function resolveTargetUri(uri?: vscode.Uri): vscode.Uri | undefined {
  if (uri) {
    return uri;
  }
  const activeEditor = vscode.window.activeTextEditor;
  return activeEditor?.document.uri;
}

function getOrCreateTerminal(fileUri: vscode.Uri, cwd: string, terminalName?: string): vscode.Terminal {
  const name = terminalName ?? `${TERMINAL_PREFIX}: ${path.basename(fileUri.fsPath)}`;

  if (terminalName) {
    const existing = vscode.window.terminals.find((t) => t.name === name);
    if (existing) {
      return existing;
    }
  }

  return vscode.window.createTerminal({ name, cwd });
}

/**
 * Ask the ms-python.python extension which interpreter is currently selected
 * for this resource. Falls back to legacy settings if the API isn't available.
 */
async function getPythonInterpreterPath(
  resource: vscode.Uri
): Promise<string | undefined> {
  const pythonExtension = vscode.extensions.getExtension('ms-python.python');

  if (pythonExtension) {
    try {
      if (!pythonExtension.isActive) {
        await pythonExtension.activate();
      }
      const api = pythonExtension.exports;

      // Modern API (Python extension >= 2022.x): environments.getActiveEnvironmentPath
      if (api?.environments?.getActiveEnvironmentPath) {
        const envPathInfo = api.environments.getActiveEnvironmentPath(resource);
        const resolved = await api.environments.resolveEnvironment?.(envPathInfo);
        const execPath =
          resolved?.executable?.uri?.fsPath ?? envPathInfo?.path;
        if (execPath) {
          return execPath;
        }
      }
    } catch {
      // fall through to settings-based fallback below
    }
  }

  // Fallback: read the python.defaultInterpreterPath / python.pythonPath setting directly.
  const pyConfig = vscode.workspace.getConfiguration('python', resource);
  const fallbackPath =
    pyConfig.get<string>('defaultInterpreterPath') ||
    pyConfig.get<string>('pythonPath');
  return fallbackPath || undefined;
}

/**
 * Given a path to a python interpreter executable, find the root directory
 * of the virtual environment it belongs to (the folder containing bin/Scripts
 * and pyvenv.cfg), if any.
 * 
 * Also detects conda environments by checking for conda-meta directory.
 */
function findVenvRoot(interpreterPath: string): string | undefined {
  // Typical layouts:
  //   <venv>/bin/python            (macOS/Linux)
  //   <venv>/Scripts/python.exe    (Windows venv)
  //   <conda>/python.exe           (Windows conda - python.exe in env root)
  //   <conda>/bin/python           (Unix conda)
  const binDir = path.dirname(interpreterPath);
  
  // First, check if python is directly in the environment root (Windows conda case)
  // Windows conda: C:\...\miniconda\envs\myenv\python.exe
  // conda-meta is at: C:\...\miniconda\envs\myenv\conda-meta
  const condaMetaSameLevel = path.join(binDir, 'conda-meta');
  if (fs.existsSync(condaMetaSameLevel)) {
    return binDir;
  }

  // Standard venv/virtualenv case where python is in bin/ or Scripts/
  const candidateRoot = path.dirname(binDir);

  const pyvenvCfg = path.join(candidateRoot, 'pyvenv.cfg');
  if (fs.existsSync(pyvenvCfg)) {
    return candidateRoot;
  }

  // Conda envs / system interpreters won't have pyvenv.cfg; still allow
  // activation if there's a recognizable Scripts/bin + activate script,
  // since some venv-like layouts skip pyvenv.cfg.
  const unixActivate = path.join(candidateRoot, 'bin', 'activate');
  const winActivate = path.join(candidateRoot, 'Scripts', 'activate.bat');
  if (fs.existsSync(unixActivate) || fs.existsSync(winActivate)) {
    return candidateRoot;
  }

  // Check for conda environment (Unix case where python is in bin/)
  // Unix conda: /path/to/conda/envs/myenv/bin/python
  // conda-meta is at: /path/to/conda/envs/myenv/conda-meta
  const condaMetaParentLevel = path.join(candidateRoot, 'conda-meta');
  if (fs.existsSync(condaMetaParentLevel)) {
    return candidateRoot;
  }

  return undefined;
}

/**
 * Build the shell command that activates the venv at venvRoot, adapted to
 * the current platform and the user's configured integrated shell.
 * 
 * Supports both regular virtual environments and conda environments.
 */
function buildActivationCommand(venvRoot: string): string | undefined {
  // Check if this is a conda environment
  const condaMeta = path.join(venvRoot, 'conda-meta');
  const isCondaEnv = fs.existsSync(condaMeta);

  if (isCondaEnv) {
    // For conda environments, use conda activate
    const envName = path.basename(venvRoot);
    return `conda activate ${envName}`;
  }

  // Regular venv activation
  if (process.platform === 'win32') {
    const shellPath = (vscode.env.shell || '').toLowerCase();
    const isPowerShell =
      shellPath.includes('powershell') || shellPath.includes('pwsh');

    if (isPowerShell) {
      const ps1 = path.join(venvRoot, 'Scripts', 'Activate.ps1');
      if (fs.existsSync(ps1)) {
        return `& "${ps1}"`;
      }
    } else {
      const bat = path.join(venvRoot, 'Scripts', 'activate.bat');
      if (fs.existsSync(bat)) {
        return `"${bat}"`;
      }
    }
    // Last resort: try the PowerShell script anyway.
    const ps1Fallback = path.join(venvRoot, 'Scripts', 'Activate.ps1');
    if (fs.existsSync(ps1Fallback)) {
      return `& "${ps1Fallback}"`;
    }
    return undefined;
  }

  // macOS / Linux
  const activateScript = path.join(venvRoot, 'bin', 'activate');
  if (fs.existsSync(activateScript)) {
    return `source "${activateScript}"`;
  }
  return undefined;
}

function buildIpythonCommand(extraArgs: string[], filePath: string): string {
  const argsStr = extraArgs.map((a) => quoteIfNeeded(a)).join(' ');
  const filePart = quoteIfNeeded(filePath);
  return argsStr
    ? `ipython ${argsStr} -i ${filePart}`
    : `ipython -i ${filePart}`;
}

function quoteIfNeeded(value: string): string {
  if (/\s/.test(value)) {
    return `"${value}"`;
  }
  return value;
}
