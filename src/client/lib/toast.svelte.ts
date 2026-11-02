export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'error';
}

let next = 1;

class Toasts {
  items = $state<Toast[]>([]);

  push(text: string, tone: Toast['tone'] = 'info', ms = 4200) {
    // The same message again refreshes instead of stacking.
    const id = next++;
    this.items = [...this.items.filter((t) => t.text !== text).slice(-2), { id, text, tone }];
    setTimeout(() => this.dismiss(id), ms);
  }

  dismiss(id: number) {
    this.items = this.items.filter((t) => t.id !== id);
  }
}

export const toasts = new Toasts();
