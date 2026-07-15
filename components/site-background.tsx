export function SiteBackground() {
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
          src="https://i.ibb.co/tPvRvdR7/Dark-abstract-background-with-subtle-geometric-shapes-and-patterns-deep-black-and-dark-gray-tones.jpg"
          alt=""
          className="h-full w-full object-cover object-center"
        />
        {/* Overlay escuro leve para legibilidade */}
        <div className="absolute inset-0 bg-black/40" />
        {/* Fade na parte inferior */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent" />
      </div>
    </>
  )
}
