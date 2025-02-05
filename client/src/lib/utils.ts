import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

declare global {
  interface Window {
    tokenInfo: () => Promise<void>;
    extendToken: (hours: number) => Promise<void>;
    revokeToken: () => Promise<void>;
  }
}

window.tokenInfo = async () => {
  const token = (document.getElementById('token') as HTMLInputElement).value;
  try {
    const response = await fetch(`/api/token/${token}`);
    const data = await response.json();
    document.getElementById('tokenStatus')!.innerHTML = `
      <div class="text-sm mt-2">
        <p>Created: ${new Date(data.created).toLocaleString()}</p>
        <p>Expires: ${new Date(data.expires).toLocaleString()}</p>
        <p>Status: ${new Date(data.expires) > new Date() ? 'Active' : 'Expired'}</p>
      </div>
    `;
  } catch (error) {
    document.getElementById('tokenStatus')!.innerHTML = '<p class="text-red-500">Error fetching token info</p>';
  }
};

window.extendToken = async (hours: number) => {
  const token = (document.getElementById('token') as HTMLInputElement).value;
  try {
    await fetch(`/api/token/${token}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours })
    });
    window.tokenInfo();
  } catch (error) {
    document.getElementById('tokenStatus')!.innerHTML = '<p class="text-red-500">Error extending token</p>';
  }
};

window.revokeToken = async () => {
  const token = (document.getElementById('token') as HTMLInputElement).value;
  if (!confirm('Are you sure you want to revoke this token? This action cannot be undone.')) return;
  
  try {
    await fetch(`/api/token/${token}/revoke`, { method: 'POST' });
    document.getElementById('tokenStatus')!.innerHTML = '<p class="text-green-500">Token successfully revoked</p>';
  } catch (error) {
    document.getElementById('tokenStatus')!.innerHTML = '<p class="text-red-500">Error revoking token</p>';
  }
};

export async function apiRequest(method: string, path: string, body?: any) {
  //Implementation of apiRequest function would go here.  This is not provided in the original code or changes.
}