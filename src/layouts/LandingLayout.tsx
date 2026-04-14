// Layout da landing do SaaS — preserva Header e Footer atuais sem alteração
import { Outlet } from 'react-router-dom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ScrollToTop from '@/components/ScrollToTop'

const LandingLayout = () => (
  <div className="flex min-h-screen flex-col bg-[#050505] text-white">
    <ScrollToTop />
    <Header />
    <main className="flex-1 bg-[#050505]">
      <Outlet />
    </main>
    <Footer />
  </div>
)

export default LandingLayout
