import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-[#0d0b09] px-4 text-[#ece3d2]">
    <div className="max-w-sm text-center">
      <p className="mb-3 font-mono text-sm tracking-[0.14em] text-[#c8a35a]">ERRO 404</p>
      <h1 className="mb-3 font-['Fraunces',serif] text-4xl font-semibold">Essa página não existe</h1>
      <p className="mb-6 text-[#bdb4a3]">O link pode estar errado ou a página saiu do ar.</p>
      <Link
        to="/"
        className="inline-block rounded-lg border border-[#c8a35a]/50 px-5 py-2.5 text-sm hover:bg-[#c8a35a] hover:text-[#0d0b09]"
      >
        Voltar ao início
      </Link>
    </div>
  </div>
);

export default NotFound;
