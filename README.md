# 🌐 PCS Global Map - Port Community Systems Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-brightgreen)](https://pages.github.com/)
[![IPCSA](https://img.shields.io/badge/data-IPCSA-0ea5e9)](https://ipcsa.international/)

> **Dashboard interativo de mapeamento global dos Port Community Systems (PCS).**  
> Aplicação web acadêmica desenvolvida para visualizar, explorar e documentar os sistemas PCS ao redor do mundo.

---

## 📋 Sobre o Projeto

### O que é um Port Community System (PCS)?

Um **Port Community System (PCS)** é uma plataforma eletrônica neutra e aberta que conecta os múltiplos sistemas operados por diversas organizações que compõem uma comunidade portuária. Trata-se de uma solução tecnológica que otimiza, gerencia e automatiza processos logísticos portuários através de uma única submissão de dados e interconexão de informações entre atores do comércio exterior, como:

- 🚢 Armadores e agentes marítimos
- 🏗️ Operadores de terminais
- 🛃 Autoridades aduaneiras e sanitárias
- 🚛 Transportadoras e operadores logísticos
- 📦 Importadores e exportadores
- 🏛️ Autoridades portuárias

A definição é alinhada com a **IPCSA (International Port Community Systems Association)**, a principal associação internacional que reúne os operadores de PCS globalmente.

### Objetivo do Mapa

Este dashboard interativo foi desenvolvido como ferramenta de pesquisa acadêmica com os seguintes objetivos:

1. **Mapear geograficamente** os Port Community Systems ao redor do mundo
2. **Visualizar a distribuição global** dos PCS por região e país
3. **Fornecer dados estruturados** sobre cada sistema (nome, localização, coordenadas, links)
4. **Facilitar análises comparativas** entre PCS de diferentes regiões
5. **Servir como recurso acadêmico** para pesquisadores da área de logística portuária

---

## 🖥️ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🗺️ **Mapa Interativo** | Visualização global com marcadores por região usando Leaflet.js |
| 🔍 **Busca em Tempo Real** | Filtragem instantânea por nome do PCS, porto ou país |
| 🏷️ **Filtros por Região** | Europa, Ásia, Américas, Oriente Médio, África e Oceania |
| 📊 **Estatísticas Dinâmicas** | Contadores animados de PCS, países, regiões e membros IPCSA |
| 📋 **Painel de Detalhes** | Informações completas ao clicar em um PCS |
| 🌓 **Mapa / Satélite** | Alternância entre estilo dark e imagens de satélite |
| 📱 **Design Responsivo** | Compatível com desktop, tablet e smartphone |
| ⌨️ **Atalhos de Teclado** | `Ctrl+K` para busca rápida, `Esc` para fechar painéis |

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- Um navegador web moderno (Chrome, Firefox, Edge, Safari)
- Um servidor HTTP local (necessário para carregamento do JSON via `fetch`)

### Opção 1: Python (recomendado)

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/port-community-system-mapa.git
cd port-community-system-mapa

# Inicie o servidor local
python -m http.server 8000

# Acesse no navegador
# http://localhost:8000
```

### Opção 2: Node.js

```bash
# Instale o serve globalmente (se ainda não tiver)
npx serve .

# Acesse no navegador
# http://localhost:3000
```

### Opção 3: VS Code (Live Server)

1. Instale a extensão **Live Server** no VS Code
2. Abra a pasta do projeto no VS Code
3. Clique com o botão direito em `index.html` → **Open with Live Server**

### Opção 4: Abrir diretamente (limitado)

> ⚠️ Alguns navegadores bloqueiam requisições `fetch` para arquivos locais. Use um dos métodos acima para melhor compatibilidade.

---

## 🏗️ Estrutura do Projeto

```
Port Community System - Mapa/
├── index.html              # Página principal do dashboard
├── README.md               # Documentação do projeto
├── css/
│   └── styles.css          # Design system e estilos da aplicação
├── js/
│   └── app.js              # Lógica principal da aplicação
└── data/
    └── pcs_locations.json  # Base de dados dos PCS (42 entradas)
```

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Uso |
|---|---|
| **HTML5** | Estrutura semântica da aplicação |
| **CSS3** | Design system com variáveis CSS, glassmorphism, animações e responsividade |
| **JavaScript (ES6+)** | Lógica da aplicação, renderização dinâmica e interatividade |
| **[Leaflet.js](https://leafletjs.com/) v1.9.4** | Biblioteca open-source para mapas interativos |
| **[CARTO Basemaps](https://carto.com/)** | Tiles do mapa estilo dark |
| **[Esri / ArcGIS](https://www.esri.com/)** | Tiles de imagem de satélite |
| **[Google Fonts (Inter)](https://fonts.google.com/specimen/Inter)** | Tipografia moderna da interface |

---

## 📊 Dados

A base de dados está localizada em [`data/pcs_locations.json`](data/pcs_locations.json) e contém **42 Port Community Systems** distribuídos em **6 regiões** e **29+ países**.

Os dados foram compilados a partir de:
- [IPCSA - International Port Community Systems Association](https://ipcsa.international/)
- Publicações acadêmicas sobre sistemas portuários comunitários
- Websites oficiais dos PCS listados

### Estrutura de cada entrada:

```json
{
  "id": "pcs-001",
  "name": "Portbase",
  "port_city": "Rotterdam / Amsterdam",
  "country": "Netherlands",
  "region": "europe",
  "lat": 51.8906,
  "lng": 4.2867,
  "website": "https://www.portbase.com/",
  "description": "National Port Community System for all Dutch seaports.",
  "flag": "🇳🇱",
  "ipcsa_member": true
}
```

---

## 👥 Créditos

| Papel | Nome |
|---|---|
| **Bolsista / Autor** | Robert Richard das Neves Correia dos Santos |
| **Orientador** | José Augusto Theodosio Pazetti |
| **Instituição / Laboratório** | CILIP |
| **Fomento** | Bolsa de Pesquisa CENEP |

---

## 📚 Referências

- IPCSA - International Port Community Systems Association. Disponível em: <https://ipcsa.international/>
- TIJAN, E. et al. *Port Community Systems: A Systematic Literature Review*. Maritime Policy & Management, 2019.
- LONG, A. *Port Community Systems*. World Customs Journal, v. 3, n. 1, 2009.

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Consulte o arquivo `LICENSE` para mais detalhes.

---

<div align="center">

**⚓ PCS Global Map** - Pesquisa e Desenvolvimento em Logística Portuária

*CILIP · CENEP · 2026*

</div>
