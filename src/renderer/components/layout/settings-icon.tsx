// The sidebar's Settings control: a hairline gear, drawn as the transport
// icons are (STYLE.md § Glyphs), since neither mono face has a gear.

export const SettingsIcon = () => (
  <svg width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='currentColor' strokeWidth='1.25' strokeLinecap='square' aria-hidden='true'>
    <circle cx='8' cy='8' r='2' />
    <path d='M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4' />
    <circle cx='8' cy='8' r='4.5' />
  </svg>
)
