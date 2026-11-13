import * as vscode from 'vscode';

export type OverwriteBehavior = 'ask' | 'always' | 'never';


interface PromptOption<T extends string> extends vscode.QuickPickItem {
  /** 點擊此選項時要回傳的結果 */
  result: T;
  /** 若有設定此值，代表同時要將此設定寫入全域 settings.json */
  persistValue?: T;
}

interface PromptConfig<T extends string> {
  /** 設定項目的完整名稱，例如 'hugoHelper.overwriteBehavior' */
  fullConfigKey: string;
  /** 視窗標題 */
  title: string;
  /** 視窗提示文字 */
  placeholder: string;
  /** 選項清單 */
  options: PromptOption<T>[];
  /** 當使用者按 Esc 或取消時的預設回傳值 */
  cancelResult: T;
}

/**
 * 共用工具：讀取設定，若為 'ask' 則顯示帶有右上角齒輪按鈕的視窗，
 * 支援修改設定後自動監聽並繼續執行。
 */
async function promptWithSettingsMemory<T extends string>(config: PromptConfig<T>): Promise<T> {
  const dotIndex = config.fullConfigKey.indexOf('.');
  const section = config.fullConfigKey.slice(0, dotIndex);
  const key = config.fullConfigKey.slice(dotIndex + 1);

  const getCurrentSetting = () =>
    vscode.workspace.getConfiguration(section).get<T>(key, 'ask' as T);

  const currentVal = getCurrentSetting();

  // 1. 若設定已經不是 'ask'，直接回傳該設定值
  if (currentVal !== 'ask') {
    return currentVal;
  }

  // 2. 若為 'ask'，建立帶有齒輪按鈕的 QuickPick 視窗
  return new Promise<T>((resolve) => {
    const quickPick = vscode.window.createQuickPick<PromptOption<T>>();
    quickPick.title = config.title;
    quickPick.placeholder = config.placeholder;
    quickPick.ignoreFocusOut = true;
    quickPick.items = config.options;

    const openSettingsBtn: vscode.QuickInputButton = {
      iconPath: new vscode.ThemeIcon('gear'),
      tooltip: '開啟設定頁面（修改後將自動繼續執行）'
    };
    quickPick.buttons = [openSettingsBtn];

    let isHandled = false;

    // 點擊右上角齒輪按鈕
    quickPick.onDidTriggerButton(async (button) => {
      if (button === openSettingsBtn) {
        isHandled = true;
        quickPick.hide();

        await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:linchao.hugo-helper'); //config.fullConfigKey ->HugoHelper

        // 監聽設定是否被修改
        const configListener = vscode.workspace.onDidChangeConfiguration((e) => {
          if (e.affectsConfiguration(config.fullConfigKey)) {
            cleanupListeners();
            const updatedVal = getCurrentSetting();
            if (updatedVal !== 'ask') {
              resolve(updatedVal);
            } else {
              // 若使用者改回 'ask'，重新顯示詢問視窗
              resolve(promptWithSettingsMemory(config));
            }
          }
        });

        // 若使用者未修改設定就直接切回編輯器，重新跳出詢問視窗
        const editorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
          if (editor) {
            cleanupListeners();
            resolve(promptWithSettingsMemory(config));
          }
        });

        const cleanupListeners = () => {
          configListener.dispose();
          editorListener.dispose();
        };
      }
    });

    // 使用者選擇其中一個項目
    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0];
      isHandled = true;
      quickPick.hide();

      if (!selected) {
        resolve(config.cancelResult);
        return;
      }

      // 如果該選項需要永久記住設定，寫入全域設定
      if (selected.persistValue) {
        await vscode.workspace
          .getConfiguration(section)
          .update(key, selected.persistValue, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('已記住您的選擇，日後可至設定中修改。');
      }

      resolve(selected.result);
    });

    // 使用者按 Esc 關閉視窗
    quickPick.onDidHide(() => {
      quickPick.dispose();
      if (!isHandled) {
        resolve(config.cancelResult);
      }
    });

    quickPick.show();
  });
}

// ============================================================================
// 匯出給主程式使用的兩個專用函式
// ============================================================================

/**
 * 1. 詢問是否覆蓋已存在的 Markdown 檔案
 */
export async function confirmOverwriteFile(fileName: string): Promise<boolean> {
  const decision = await promptWithSettingsMemory<OverwriteBehavior>({
    fullConfigKey: 'hugoHelper.overwriteBehavior',
    title: `檔案 ${fileName} 已經存在`,
    placeholder: '您要覆蓋它嗎？（點擊右上角齒輪可修改預設行為）',
    cancelResult: 'never',
    options: [
      { label: '$(check) 覆蓋檔案', description: '僅覆蓋這一次', result: 'always' },
      { label: '$(check-all) 總是覆蓋（不再詢問）', description: '記住此選擇並更新設定', result: 'always', persistValue: 'always' },
      { label: '$(close) 取消', description: '不執行任何動作', result: 'never' }
    ]
  });

  return decision === 'always';
}

/**
 * 2. 詢問如何刪除「_」前綴圖片（暫時丟垃圾桶 vs 永久刪除）
 */
export async function confirmDeleteImages(imageCount: number): Promise<boolean> {
  const decision = await promptWithSettingsMemory<OverwriteBehavior>({
    fullConfigKey: 'hugoHelper.deleteImageBehavior',
    title: `找到 ${imageCount} 張以「_」開頭的圖片`,
    placeholder: '請選擇刪除方式（點擊右上角齒輪可修改預設行為）',
    cancelResult: 'never',
    options: [
      { label: '$(check) 刪除檔案', description: '僅刪除這一次', result: 'always' },
      { label: '$(check-all) 都刪除（不再詢問）', description: '記住此選擇並更新設定', result: 'always', persistValue: 'always' },
      { label: '$(check) 不刪除', description: '不刪除任何圖檔', result: 'never' },
      { label: '$(check-all) 都不刪除（不再詢問）', description: '記住此選擇並更新設定', result: 'never', persistValue: 'never' },

    ]
  });

  return decision === 'always';
}
