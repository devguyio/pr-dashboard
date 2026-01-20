'use client';

import { useEffect, useState } from 'react';

interface Config {
  githubToken?: string;
  defaultRepos?: string[];
  dashboards?: Array<{
    id: string;
    name: string;
    repos: string;
    filter: string;
  }>;
}

const CONFIG_KEY = 'pr-dashboard-config';

function getDefaultConfig(): Config {
  return {
    githubToken: '',
    defaultRepos: [],
    dashboards: [],
  };
}

export function loadConfig(): Config {
  if (typeof window === 'undefined') return getDefaultConfig();

  const saved = localStorage.getItem(CONFIG_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return getDefaultConfig();
    }
  }

  return getDefaultConfig();
}

export function saveConfig(config: Config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function useIsElectron() {
  // null = not yet determined, false = not electron, true = electron
  const [isElectron, setIsElectron] = useState<boolean | null>(null);

  // Check after mount to avoid hydration mismatch
  useEffect(() => {
    setIsElectron(!!window.electronAPI?.isElectron);
  }, []);

  return isElectron;
}

export interface ElectronConfig {
  githubToken: string | null;
  defaultRepos: string[];
  dashboards: Array<{
    id: string;
    name: string;
    repos: string;
    filter: string;
  }>;
}

export function useElectronConfig(): ElectronConfig | null {
  const isElectron = useIsElectron();
  const [config, setConfig] = useState<ElectronConfig | null>(null);

  // Load config after mount when we know if we're in Electron
  useEffect(() => {
    if (isElectron) {
      const loaded = loadConfig();
      setConfig({
        githubToken: loaded.githubToken || null,
        defaultRepos: loaded.defaultRepos || [],
        dashboards: loaded.dashboards || [],
      });
    }
  }, [isElectron]);

  return config;
}
