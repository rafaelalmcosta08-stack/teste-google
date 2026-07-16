interface SiteBackgroundProps {
  hasSidebar?: boolean
}

export function SiteBackground({ hasSidebar = false }: SiteBackgroundProps) {
  return (
    <>
      {/* Camada base escura caso a imagem demore a carregar */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{ zIndex: -20, backgroundColor: "#0d0d0d" }}
      />
      {/* Imagem de fundo via elemento img real */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
        style={{ zIndex: -10 }}
      >
        <img
          src="https://res.cloudinary.com/epo1w9hl/image/upload/v1784175519/Design_sem_nome_miw3dc.png"
          alt=""
          className="h-full w-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        {/* Overlay escuro leve para legibilidade do texto */}
        <div className="absolute inset-0 bg-black/25" />
        {/* Fade na parte inferior */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
      </div>
    </>
  )
}

