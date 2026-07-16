interface SiteBackgroundProps {
  hasSidebar?: boolean
}

export function SiteBackground({ hasSidebar = false }: SiteBackgroundProps) {
  return (
    <>
      {/* Camada base escura caso a imagem demore a carregar */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none fixed inset-0"
        style={{ zIndex: -10, backgroundColor: "#07090e" }}
      />
      {/* Imagem de fundo via elemento img real */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none fixed inset-0 overflow-hidden"
        style={{ zIndex: -9 }}
      >
        <img
          src="https://res.cloudinary.com/epo1w9hl/image/upload/v1784175519/Design_sem_nome_miw3dc.png"
          alt=""
          className="h-full w-full object-cover object-center pointer-events-none select-none opacity-20"
          referrerPolicy="no-referrer"
        />
        {/* Overlay escuro de alta legibilidade para garantir que o texto e os cards fiquem nítidos */}
        <div className="absolute inset-0 bg-black/65 pointer-events-none select-none" />
        {/* Fade na parte inferior */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#07090e] to-transparent pointer-events-none select-none" />
      </div>
    </>
  )
}

