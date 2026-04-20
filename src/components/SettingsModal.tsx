import { useState } from 'react';
import type { LLMConfig } from '../types';
import { getRegisteredProviders } from '../engine/llm';
import { SETTINGS_STORAGE_KEY } from './settingsStorage';

interface SettingsModalProps {
  isOpen: boolean;
  onSave: (config: LLMConfig) => void;
  onClose?: () => void;
  initialConfig?: LLMConfig;
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  moonshot: 'Kimi (Moonshot)',
  qwen: '通义千问',
  zhipu: '智谱 GLM',
};

const MODEL_PLACEHOLDERS: Record<string, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  deepseek: 'deepseek-chat',
  moonshot: 'moonshot-v1-8k',
};

export default function SettingsModal({ isOpen, onSave, onClose, initialConfig }: SettingsModalProps) {
  const providers = getRegisteredProviders();
  const [provider, setProvider] = useState(initialConfig?.provider || providers[0] || 'openai');
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || '');
  const [model, setModel] = useState(initialConfig?.model || '');
  const [baseUrl, setBaseUrl] = useState(initialConfig?.baseUrl || '');
  const [showKey, setShowKey] = useState(false);

  if (!isOpen) return null;

  const isFirstTime = !onClose;

  const handleSave = () => {
    const config: LLMConfig = {
      provider,
      apiKey,
      model: model || MODEL_PLACEHOLDERS[provider] || 'model-name',
      baseUrl: baseUrl || undefined,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(config));
    onSave(config);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        className="w-full max-w-md mx-4 p-6 rounded-sm"
        style={{ backgroundColor: '#1a1a24', border: '1px solid #2a2a34' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold font-ui" style={{ color: '#e8e0d0' }}>
            配置
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-sm cursor-pointer"
              style={{ color: '#8a8070' }}
            >
              关闭
            </button>
          )}
        </div>

        <div className="space-y-4 font-ui">
          {/* 模型服务 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: '#8a8070' }}>
              模型服务
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 rounded-sm text-sm outline-none"
              style={{
                backgroundColor: '#1a1a24',
                border: '1px solid #2a2a34',
                color: '#e8e0d0',
              }}
            >
              {providers.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p] || p}
                </option>
              ))}
            </select>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm mb-1" style={{ color: '#8a8070' }}>
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 pr-12 rounded-sm text-sm outline-none"
                style={{
                  backgroundColor: '#1a1a24',
                  border: '1px solid #2a2a34',
                  color: '#e8e0d0',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs cursor-pointer"
                style={{ color: '#8a8070' }}
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          {/* 模型名称 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: '#8a8070' }}>
              模型名称
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={MODEL_PLACEHOLDERS[provider] || 'model-name'}
              className="w-full px-3 py-2 rounded-sm text-sm outline-none"
              style={{
                backgroundColor: '#1a1a24',
                border: '1px solid #2a2a34',
                color: '#e8e0d0',
              }}
            />
          </div>

          {/* API 地址 */}
          <div>
            <label className="block text-sm mb-1" style={{ color: '#8a8070' }}>
              API 地址（可选）
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="留空使用默认地址"
              className="w-full px-3 py-2 rounded-sm text-sm outline-none"
              style={{
                backgroundColor: '#1a1a24',
                border: '1px solid #2a2a34',
                color: '#e8e0d0',
              }}
            />
            <p className="text-xs mt-1" style={{ color: '#8a8070' }}>
              使用自部署或代理时填写
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!apiKey.trim()}
          className="w-full mt-6 px-4 py-2.5 rounded-sm text-sm font-ui cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#2a2a34',
            color: '#e8e0d0',
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = '#3a3a44';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#2a2a34';
          }}
        >
          {isFirstTime ? '开始游戏' : '保存'}
        </button>
      </div>
    </div>
  );
}
