interface SiteBackgroundProps {
  hasSidebar?: boolean
}

export function SiteBackground({ hasSidebar = false }: SiteBackgroundProps) {
  return (
    <>
      {/* Imagem de fundo via elemento img real */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none fixed inset-0 overflow-hidden"
        style={{ zIndex: -9 }}
      >
        <img
          src="https://res.cloudinary.com/epo1w9hl/image/upload/v1784224784/copy_of_design_sem_nome_3_abmy2s.png"
          alt=""
          className="h-full w-full object-cover object-center pointer-events-none select-none"
          referrerPolicy="no-referrer"
        />
      </div>
    </>
  )
}

