export function registerShutdown(cleanup: () => Promise<void>){
    const shutdown = async (signal: string) => {
        console.log(`Received ${signal}. Closing process...`);
        
        await cleanup();

        process.exit(0);
    };

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
}