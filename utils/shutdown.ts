/**
 * Registers handlers for graceful process shutdown.
 *
 * Executes the provided cleanup function when the process receives
 * SIGINT or SIGTERM, then exits the process.
 *
 * @param cleanup - Async function responsible for releasing process resources.
 */

export function registerShutdown(cleanup: () => Promise<void>){
    const shutdown = async (signal: string) => {
        console.log(`Received ${signal}. Closing process...`);

        await cleanup();

        process.exit(0);
    };

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
}