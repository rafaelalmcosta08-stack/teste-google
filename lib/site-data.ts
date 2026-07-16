import {
  Shield,
  Search,
  Car,
  Target,
  Crosshair,
  Heart,
  Zap,
  Bike,
  Plane,
  Scale,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react'

export type Unit = {
  sigla: string
  nome: string
  descricao: string
  icon: LucideIcon
  image?: string
}

export const units: Unit[] = [
  {
    sigla: 'PM',
    nome: 'Polícia Militar',
    descricao:
      'Responsável pelo policiamento ostensivo e preservação da ordem pública. Atua na prevenção e repressão imediata de crimes.',
    icon: Shield,
  },
  {
    sigla: 'PC',
    nome: 'Polícia Civil',
    descricao:
      'Responsável pela investigação de crimes e infrações penais. Conduz inquéritos policiais e apura autoria e materialidade.',
    icon: Search,
  },
  {
    sigla: 'CORE',
    nome: 'Coordenação de Recursos Especiais',
    descricao:
      'Unidade tática responsável por apoiar as demais divisões em operações de baixo risco e de patrulhamento especial, especializada em ações Medias e Pequenas, atuando em intervenções rápidas.',
    icon: Crosshair,
    image: '/images/unit-cot.png',
  },
  {
    sigla: 'BOPE',
    nome: 'Batalhão de Operações Policiais Especiais',
    descricao:
      'Unidade de elite responsável por ações grandes na cidade de Aspect. Especializada em operações de alto risco, resgate de reféns e situações de crise que exigem máxima força e precisão.',
    icon: Target,
    image: '/images/unit-coe.png',
  },
  {
    sigla: 'GAR',
    nome: 'Grupamento de Rápida Resposta',
    descricao:
      'Unidade especializada em perseguição e interceptação veicular. Equipada com viaturas de alta performance, atua na contenção de fugas e no cerco a suspeitos em vias expressas, sendo acionada em situações que exigem velocidade e resposta imediata.',
    icon: Zap,
  },
  {
    sigla: 'GTM',
    nome: 'Grupamento Tático de Motociclistas',
    descricao:
      'Unidade de mobilidade urbana montada em motocicletas. Atua no patrulhamento ágil de áreas de difícil acesso para viaturas convencionais, apoio em perseguições em vias estreitas e deslocamento rápido entre ocorrências simultâneas.',
    icon: Bike,
  },
  {
    sigla: 'GAEP',
    nome: 'Grupamento Aéreo de Escolta e Patrulhamento',
    descricao:
      'Unidade aérea composta por oficiais pilotos e atiradores especializados. Responsável pelo monitoramento aéreo da cidade, escolta de operações terrestres e apoio de precisão em situações de alto risco, com visão privilegiada sobre o terreno.',
    icon: Plane,
  },
  {
    sigla: 'CORREGEDORIA',
    nome: 'Unidade de Controle Interno',
    descricao:
      'Órgão responsável pela apuração de denúncias, investigação de condutas irregulares e aplicação de sanções administrativas dentro das corporações policiais. Atua na fiscalização do cumprimento de normas internas, garantindo a integridade e a disciplina dos agentes.',
    icon: Scale,
  },
  {
    sigla: 'APM',
    nome: 'Academia da Polícia Militar',
    descricao:
      'Unidade responsável pela formação, capacitação e recrutamento de novos agentes. Conduz cursos de formação básica, treinamentos especializados e processos seletivos, preparando os candidatos para o ingresso e a atuação nas demais divisões policiais.',
    icon: GraduationCap,
  },
]

export type ManualSection = {
  id: string
  titulo: string
  icon: string
  conteudo: string
  lista?: string[]
  rodape?: string
}

export const manualSections: ManualSection[] = [
  {
    id: 'roupas',
    titulo: 'Roupas do Taff',
    icon: 'shirt',
    conteudo:
      'Durante o TAFF é obrigatório o uso do fardamento padrão. Apresente-se sempre com a farda completa, coturno e sem acessórios que não fazem parte do uniforme oficial do departamento.',
    lista: [
      'Farda operacional padrão do departamento',
      'Coturno preto de cano alto',
      'Colete balístico quando solicitado',
      'Proibido acessórios pessoais (correntes, óculos escuros, etc.)',
    ],
  },
  {
    id: 'introducao',
    titulo: 'Introducao ao Estudo',
    icon: 'book',
    conteudo:
      'E necessario um estudo ou conhecimento basico para ser recrutado, entre eles:\n\n - Codigo Q\n - Regras gerais\n - Modulacao\n - Codigo de Intensidade\n - Uso progressivo da forca\n - Codigo de Abordagem\n\nO material esta disponivel abaixo, para estudo e consulta!\n\nOBS: Lembrando que no momento do recrutamento e extremamente proibido qualquer forma de cola ou consulta!',
  },
  {
    id: 'codigo-q',
    titulo: 'Codigo Q',
    icon: 'radio',
    conteudo:
      'O Codigo Q é um conjunto padronizado de códigos utilizados nas comunicações via rádio. Os principais códigos que você precisa saber são:',
    lista: [
      'QAP - Na escuta / Estou na escuta',
      'QRA - Nome / Identificação',
      'QRR - Solicitar apoio / Reforço',
      'QRU - Tem alguma coisa para mim? / Mensagem',
      'QRV - Estou pronto / A disposição',
      'QSL - Entendido / Ciente',
      'QTA - Cancele a mensagem anterior',
      'QTH - Local / Localização',
      'QTO - Banheiro / Necessidades fisiológicas',
      'QTR - Hora certa',
    ],
    rodape:
      'Estes códigos devem ser usados corretamente nas comunicações para manter a clareza e objetividade nas transmissões.',
  },
  {
    id: 'modulacao',
    titulo: 'Modulacao',
    icon: 'message',
    conteudo:
      'A modulacao deve sempre seguir um padrao: clara, objetiva e completa. Quando realizada lembre-se dos seguintes elementos:\n\nDESCRICAO: Caracteristicas fisicas e vestimentas quando se trata de pessoas. Modelo, cor, e quantidade de tripulantes em caso de veiculos.\n\nQTH: Qual a localidade do informe, necessario que sempre seja por voz!\n\nVISUAL/QRU: Caso tenha um visual de alguem armado, um flagrante ou situacao.\n\nESTRUTURA DA MODULACAO:\n\n1. Contato Inicial: "QAP CENTRAL..."\n2. Acao Realizada: Iniciando Abordagem / Iniciando Acompanhamento\n3. QRU: Atividade ilegal ocorrida ou que esteja acontecendo no momento\n4. QTH: Local do mapa onde a abordagem esta ocorrendo ou referencia mais proxima\n5. Descricao: Caracteristicas fisicas e vestimentas em situacao de civis a pe. Modelo, cor, emplacamento e quantidade de tripulantes em caso de veiculos\n6. QRR: Em caso de acompanhamento, informe a unidade de vagas para apoio\n\nEXEMPLOS:\n\nExemplo 1: "QAP central iniciando acompanhamento a um S15 vermelho tripulado por 1 pessoa, saiu de uma QRU de roubo a propriedade, QTH regiao do vanila seguindo sentido praca, com vaga para 2 unidades preferencia Speed."\n\nExemplo 2: "QAP central iniciando abordagem a 2 individuos, uma mulher e um homem, ambos mascarados com roupas azuis, com visual de ambos armados, no QTH do Hospital."',
  },
  {
    id: 'intensidade',
    titulo: 'Codigo de Intensidade',
    icon: 'gauge',
    conteudo:
      'Os codigos de intensidade sao utilizados durante o patrulhamento vao do 0 a 7, de acordo com a situacao e o nivel de periculosidade da ocorrencia. Sendo eles:\n\nCODIGO 0 - Patrulhamento normal, sem ocorrencias\nCODIGO 1 - Abordagem de rotina, situacao sob controle\nCODIGO 2 - Situacao suspeita, requer atencao\nCODIGO 3 - Ocorrencia em andamento, necessita apoio\nCODIGO 4 - Situacao de risco, perigo iminente\nCODIGO 5 - Perseguicao em andamento\nCODIGO 6 - Tiroteio / Troca de tiros\nCODIGO 7 - Situacao critica, todos os recursos disponiveis\n\nUtilize o codigo correto para informar a central sobre a gravidade da situacao e receber o apoio adequado.',
  },
  {
    id: 'forca',
    titulo: 'Uso Progressivo da Forca',
    icon: 'shield',
    conteudo:
      'Diante dos diferentes tipos de ameacas enfrentadas no cotidiano policial, nossa postura deve ser reflexo das atitudes dos civis abordados em ocorrencias.\n\nA autoridade policial deve sempre fazer o uso progressivo da forca, que consiste na aplicacao correta e adequada da forca policial de acordo com o nivel de acao do individuo a ser controlado.\n\nSaiba usar o uso progressivo da forca para que nao cometa o abuso de poder.\n\nNIVEL 1 - Presenca Policial\nApenas a presenca policial uniformizado e o suficiente para prevenir um crime.\n\nNIVEL 2 - Verbalizacao\nImpor presenca e respeito, estabelecendo paciencia e tranquilidade parente o cidadao.\n\nNIVEL 3 - Controle de Contato (Algemas)\nUso de algemas para imobilizacao, quando apresenta desobediencia ou resistencia.\n\nNIVEL 4 - Tecnicas de Imobilizacao\nE quando age sem a forca letal, apenas utilizando tecnicas para imobilizar durante a fuga a pe.\n\nNIVEL 5 - Armas Menos Letais\nQuando o individuo esta no estado de raiva, o uso do taser e cassetete e essencial para imobiliza-lo.\n\nNIVEL 6 - Forca Letal\nQuando o uso de armas de fogo e liberado contra a guarnicao apresentando risco de morte.',
  },
  {
    id: 'abordagem',
    titulo: 'Codigo de Abordagem',
    icon: 'users',
    conteudo:
      'As abordagens seguem o nivel de periculosidade do fato/situacao. Sendo assim, o padrao das abordagens deve ser como esta descrito a seguir.\n\nABORDAGEM DE CODIGO 1\nAbordagem de carater instrutivo, sem necessidade de revista. Utilizada em situacoes como:\n - Condutor de motocicleta sem uso de equipamento de protecao adequado\n - Solicitar que veiculo danificado seja reparado\n - Solicitar que bincadeiras ou comportamentos indevidos cessem\n - Orientacao sobre estacionamento em local indevido\n - Veiculo em alta velocidade\n - Cidadao ve uma viatura e sai na direcao oposta\n\nABORDAGEM DE CODIGO 2\nAbordagem realizada quando existe a suspeita de ato ilegal (sem confirmacao), sem necessidade de revista. Porem, neste caso deve ser usado o teste residual para fazer a confirmacao da suspeita do ato ilegal, em caso do teste positivo, ou confirmacao de suspeita, a revista esta legitimada.\n\nABORDAGEM DE CODIGO 3\nAbordagem realizada quando existe a confirmacao do ato ilegal, com necessidade de revista, dispensa o uso do kit residual, pois houve flagrante de delito. Entretanto o dialogo deve prevalecer, mantendo o controle da situacao. Utilizada em situacoes como:\n - Condutor atropela algum civil ou policial\n - Risco direto a vida de um oficial\n - Civil com qualquer tipo de armamento exposto\n - Qualquer flagrante\n - Risco direto a vida de qualquer civil',
  },
]
