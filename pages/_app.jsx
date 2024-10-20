import '../styles/global.css'
import { Schoolbell } from 'next/font/google'
import { Poppins } from 'next/font/google'

const schoolbell = Schoolbell({ subsets: ['latin'], weight: '400' })
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '600'] })

export default function MyApp({ Component, pageProps }) {
    return (
        <main className={poppins.className}>
            <Component {...pageProps} />
        </main>
    )
}