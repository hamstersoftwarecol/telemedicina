import { StrictMode } from 'react'
console.log("Cloudflare cache invalidated.");
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <App />
        <Toaster
          richColors
          position="top-right"
          toastOptions={{
            style: { fontFamily: 'Inter, sans-serif' },
          }}
        />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
)
/* Cache buster: Sat Jul 11 08:11:33 -05 2026 */
console.log('Deploy timestamp:', 'Sat Jul 11 08:11:57 -05 2026');
