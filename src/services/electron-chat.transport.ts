import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai'

export class ElectronChatTransport implements ChatTransport<UIMessage> {
  constructor(private readonly projectId: string) {}

  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]): Promise<
    ReadableStream<UIMessageChunk>
  > {
    if (!window.npmate) throw new Error('AI 功能仅可在 Electron 中使用。')

    const requestId = crypto.randomUUID()
    const projectId = this.projectId
    return new ReadableStream<UIMessageChunk>({
      start(controller) {
        const cleanup = () => {
          unsubscribe()
          abortSignal?.removeEventListener('abort', abort)
        }
        const unsubscribe = window.npmate.ai.onAssistStreamEvent((event) => {
          if (event.requestId !== requestId) return
          if (event.chunk) controller.enqueue(event.chunk)
          if (event.error) {
            cleanup()
            controller.error(new Error(event.error))
          } else if (event.done) {
            cleanup()
            controller.close()
          }
        })
        const abort = () => {
          window.npmate.ai.cancelAssistStream(requestId)
          cleanup()
          controller.close()
        }
        abortSignal?.addEventListener('abort', abort, { once: true })
        window.npmate.ai.startAssistStream({
          requestId,
          projectId,
          messages,
        })
      },
    })
  }

  async reconnectToStream(): Promise<null> {
    return null
  }
}
