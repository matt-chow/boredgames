/** Report labels for bots. The internal names stay, because they seed the benchmark games. */
const LABELS: Record<string, string> = {
  Spark: 'Influence Engine',
  Works: 'Crown Project Development',
  Devices: 'Establishment Engine',
};

export const botLabel = (name: string) => LABELS[name] ?? name;
