declare module 'address' {
  function ip(): string;
  function ipv6(): string;
  function mac(callback: (err: Error | null, addr: string) => void): void;
  function dns(callback: (err: Error | null, addrs: string[]) => void): void;
  export = {
    ip,
    ipv6,
    mac,
    dns,
  };
}
