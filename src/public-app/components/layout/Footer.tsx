import React from 'react';
import { Link } from 'react-router-dom'; // IMPORTAÇÃO OBRIGATÓRIA AQUI
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="relative z-10 bg-black/80 backdrop-blur-md border-t border-white/10 py-12 px-6 md:px-20 mt-20 w-full">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        
        <div>
          <h3 className="text-xl font-bold mb-4 text-red-600">BAZAR TV</h3>
          <p className="text-gray-400 text-sm">O melhor do entretenimento angolano e internacional, feito para si.</p>
        </div>
        
        <div>
          <h4 className="font-bold text-white mb-4">Links Rápidos</h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            {/* Trocamos os <li> de texto por <li> com <Link> */}
            <li><Link to="/conta" className="hover:text-red-500 transition-colors cursor-pointer block">Conta</Link></li>
            <li><Link to="/ajuda" className="hover:text-red-500 transition-colors cursor-pointer block">Ajuda</Link></li>
            <li><Link to="/termos-de-uso" className="hover:text-red-500 transition-colors cursor-pointer block">Termos de Uso</Link></li>
            <li><Link to="/privacidade" className="hover:text-red-500 transition-colors cursor-pointer block">Privacidade</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-white mb-4">Categorias</h4>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li><Link to="/desporto" className="hover:text-red-500 transition-colors cursor-pointer block">Desporto</Link></li>
            <li><Link to="/filmes" className="hover:text-red-500 transition-colors cursor-pointer block">Filmes</Link></li>
            <li><Link to="/noticias" className="hover:text-red-500 transition-colors cursor-pointer block">Notícias</Link></li>
            <li><Link to="/infantil" className="hover:text-red-500 transition-colors cursor-pointer block">Infantil</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-bold text-white mb-4">Redes Sociais</h4>
          <div className="flex gap-4 text-white">
             {/* As redes sociais continuam com <a> porque vão para fora do teu site */}
             <a href="Https://www.facebook.com/share/1QL9UHLbYZ/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-red-600 transition">
               <Facebook size={20}/>
             </a>
             <a href="Https://www.instagram.com/bazar_tv_?igsh=NHduYm1vYmJwNnpk" target="_blank" rel="noopener noreferrer" className="p-2 bg-white/10 rounded-full hover:bg-red-600 transition">
               <Instagram size={20}/>
             </a>
             <a href="#" className="p-2 bg-white/10 rounded-full hover:bg-red-600 transition">
               <Twitter size={20}/>
             </a>
             <a href="#" className="p-2 bg-white/10 rounded-full hover:bg-red-600 transition">
               <Youtube size={20}/>
             </a>
          </div>
        </div>

      </div>
      
      <div className="text-center text-gray-500 text-xs border-t border-white/5 pt-8">
        © 2026 Bazar TV Angola. Todos os direitos reservados.
      </div>
    </footer>
  );
};

export default Footer;