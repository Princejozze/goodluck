import React from 'react';
import { ShieldCheck, Phone, Mail, MapPin } from 'lucide-react';
import { AppLanguage } from '../types/index.js';

interface FooterProps {
  language: AppLanguage;
}

export const Footer: React.FC<FooterProps> = ({ language }) => {
  const t = {
    en: {
      tagline:
        'Tanzania’s everything-for-hire marketplace. Bridging construction contractors, commercial farmers, event planners, and creative producers with verified equipment fleets.',
      registered: 'Free equipment booking platform',
      categoriesTitle: 'Equipment Categories',
      depotsTitle: 'Service Depots',
      escrowTitle: 'Free to Use',
      escrowDesc:
        'RENTZ does not collect payments. Renters and owners agree and settle hire charges directly once a booking is accepted.',
      rights: 'RENTZ Technologies Limited. All rights reserved.',
      terms: 'Terms of Equipment Hire',
      escrowPolicy: 'Booking Policy',
      sellOnRentz: 'Sell on RENTZ',
      dataProtection: 'Tanzania Data Protection Act 2022',
    },
    sw: {
      tagline:
        'Soko kuu la kukodisha kila kitu nchini Tanzania. Kuunganisha wakandarasi wa ujenzi, wakulima, waandaaji wa matukio na watengeneza filamu na wamiliki wa mitambo.',
      registered: 'Jukwaa la bure la kukodi vifaa',
      categoriesTitle: 'Makundi ya Vifaa',
      depotsTitle: 'Vituo vya Huduma',
      escrowTitle: 'Bure Kutumia',
      escrowDesc:
        'RENTZ haikusanyi malipo. Mkodishaji na mmiliki hukubaliana na kulipana moja kwa moja baada ya oda kukubaliwa.',
      rights: 'RENTZ Technologies Limited. Haki zote zimehifadhiwa.',
      terms: 'Masharti ya Ukodishaji',
      escrowPolicy: 'Sera ya Uhifadhi',
      sellOnRentz: 'Uza kupitia RENTZ',
      dataProtection: 'Sheria ya Kulinda Data ya Tanzania 2022',
    },
    fr: {
      tagline:
        'La plateforme de location universelle en Tanzanie. Reliant entrepreneurs du BTP, agriculteurs, organisateurs d’événements et créateurs aux flottes d’équipements certifiées.',
      registered: 'Enregistré BRELA · Conforme TVA TRA',
      categoriesTitle: 'Catégories d’Équipements',
      depotsTitle: 'Dépôts & Agences',
      escrowTitle: 'Gratuit',
      escrowDesc:
        'RENTZ ne collecte aucun paiement. Locataires et propriétaires règlent directement la location une fois la réservation acceptée.',
      rights: 'RENTZ Technologies Limited. Tous droits réservés.',
      terms: 'Conditions Générales de Location',
      escrowPolicy: 'Politique de Réservation',
      sellOnRentz: 'Vendre sur RENTZ',
      dataProtection: 'Loi Tanzanienne sur la Protection des Données 2022',
    },
  }[language];

  return (
    <footer className="bg-stone-950 text-stone-400 border-t border-stone-800 text-xs mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Purpose */}
          <div className="space-y-3">
            <span className="text-lg font-black text-white tracking-tight">
              <span className="text-amber-500">RENT</span>Z
            </span>
            <p className="text-stone-400 text-xs leading-relaxed">{t.tagline}</p>
            <div className="flex items-center gap-2 text-stone-300">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>{t.registered}</span>
            </div>
          </div>

          {/* Key Categories */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-white text-xs mb-3">
              {t.categoriesTitle}
            </h4>
            <ul className="space-y-2 text-stone-400">
              <li>Construction & Plant Machinery</li>
              <li>Agriculture & Farm Tractors</li>
              <li>Events & Marquee Infrastructure</li>
              <li>Transport, Trucks & Vans</li>
              <li>Media, Cinema & Drones</li>
              <li>Office, Servers & Audiovisual</li>
            </ul>
          </div>

          {/* Operating Hubs */}
          <div>
            <h4 className="font-bold uppercase tracking-wider text-white text-xs mb-3">
              {t.depotsTitle}
            </h4>
            <ul className="space-y-2 text-stone-400">
              <li>Dar es Salaam (Kinondoni, Ilala, Temeke, Ubungo)</li>
              <li>Arusha & Kilimanjaro (Njiro & Moshi)</li>
              <li>Mwanza (Lake Zone Civil Depot)</li>
              <li>Dodoma (Capital Central Yard)</li>
              <li>Zanzibar (Stone Town & Fumba Hub)</li>
              <li>Mbeya & Morogoro Regional Points</li>
            </ul>
          </div>

          {/* Contact & Free Platform */}
          <div className="space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-white text-xs mb-1">
              {t.escrowTitle}
            </h4>
            <p className="text-stone-400 text-[11px] leading-relaxed">{t.escrowDesc}</p>
            <div className="pt-2 text-stone-300 space-y-1.5 text-xs">
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-500" />
                <span>255793481147 / 255743801992</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-500" />
                <span>safarigoodluck35@gmail.com</span>
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                <span>RENTZ Tower, Mikocheni, Dar es Salaam</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quiet Bottom Legal */}
        <div className="pt-8 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-stone-500">
          <p>
            © {new Date().getFullYear()} {t.rights}
          </p>
          <div className="flex gap-4">
            <span className="hover:text-stone-300">{t.terms}</span>
            <span>·</span>
            <span className="hover:text-stone-300">{t.escrowPolicy}</span>
            <span>·</span>
            <span className="hover:text-stone-300">{t.dataProtection}</span>
            <span>·</span>
            {/* Seller Centre lives at its own address, like AliExpress's "Sell on" link */}
            <a href="/seller" className="text-amber-500 hover:text-amber-400 font-semibold">
              {t.sellOnRentz}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
