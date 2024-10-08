import * as vscode from 'vscode';

const INTERVAL_MINUTES = 18;
const LOCKDOWN_MESSAGE = "Look at something 20 feet away for 20 seconds";
const LOCKDOWN_TIME = 20;

type LockdownConfig = {
	intervalMinutes: number;
	message: string;
	duration: number;
};

let lockdownInterval: NodeJS.Timeout | undefined;
let lockdownPanel: vscode.WebviewPanel | undefined;
let timeLeft: number = 0;
let config: LockdownConfig;

export function activate(context: vscode.ExtensionContext) {
	console.log('Lockdown extension is now active');
	config = {
		intervalMinutes: INTERVAL_MINUTES,
		message: LOCKDOWN_MESSAGE,
		duration: LOCKDOWN_TIME
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('vscode-lock.start_lockdown_timer', () => startLockdown(context)),
		vscode.commands.registerCommand('vscode-lock.stop_lockdown_timer', () => stopLockdown(context)),
		vscode.commands.registerCommand('vscode-lock.lock', () => lockdown(context))
	);
}

function startLockdown(context: vscode.ExtensionContext) {
	if (lockdownInterval) {
		clearInterval(lockdownInterval);
	}

	lockdownInterval = setInterval(() => {
		lockdown(context);
	}, config.intervalMinutes * 60 * 1000);
}

function stopLockdown(context: vscode.ExtensionContext) {
	if (lockdownInterval) {
		clearInterval(lockdownInterval);
	}
}

function lockdown(context: vscode.ExtensionContext) {
	if (lockdownPanel) {
		return;
	}

	timeLeft = config.duration;
	showLockdownMessage(context);

	let countdownInterval = setInterval(() => {
		timeLeft--;
		if (timeLeft <= 0) {
			clearInterval(countdownInterval);
			lockdownPanel?.dispose();
			lockdownPanel = undefined;
		} else {
			updateLockdownMessage(context, timeLeft);
		}
	}, 1000);
}

function showLockdownMessage(context: vscode.ExtensionContext) {
	lockdownPanel = vscode.window.createWebviewPanel(
		'lockdownMessage',
		'Lockdown',
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			retainContextWhenHidden: true
		}
	);

	lockdownPanel.onDidDispose(() => {
		if (timeLeft > 0) {
			showLockdownMessage(context);
		}
	});

	lockdownPanel.onDidChangeViewState(e => {
		if (lockdownPanel && !e.webviewPanel.visible) {
			lockdownPanel.reveal(vscode.ViewColumn.One);
		}
	});
}

function updateLockdownMessage(context: vscode.ExtensionContext, timeLeft: number) {
	if (lockdownPanel) {
		lockdownPanel.webview.html = getLockdownHtml(timeLeft, config.message);
	}
}

function getLockdownHtml(timeLeft: number, message: string) {
	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Lockdown</title>
            <style>
                body {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                    font-family: Arial, sans-serif;
                }
                .message {
                    font-size: 24px;
                    text-align: center;
                }
            </style>
        </head>
        <body>
            <div class="message">
                <h1>🔒 Lockdown Active 🔒</h1>
                <p>${message}</p>
                <p>Time remaining: ${timeLeft} seconds</p>
            </div>
        </body>
        </html>
    `;
}

export function deactivate() {
	if (lockdownInterval) {
		clearInterval(lockdownInterval);
	}
}
