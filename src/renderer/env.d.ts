import type { RecordBridge } from '#shared/bridge.ts'

declare global {
  interface Window {
    record: RecordBridge
  }
}
