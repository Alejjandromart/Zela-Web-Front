# Zela — Frontend

Interface web de gestão de chamados de manutenção do campus, com perfis de solicitante, técnico e administrador. Desenvolvida com HTML5, CSS3 e JavaScript.

Este repositório contém uma demonstração com dados locais. Autenticação, cadastros e alterações de chamados são simulados no navegador. A integração com a API Express e o PostgreSQL está pendente.

## Executar

Requer Python 3 e um navegador com JavaScript e IndexedDB.

```bash
git clone --branch develop https://github.com/Alejjandromart/Zela-Web-Front.git
cd Zela-Web-Front
python -m http.server 8000 --bind 127.0.0.1 --directory frontend
```

Abra [o login](http://127.0.0.1:8000/login.html). Encerre com `Ctrl+C`. Use sempre o mesmo endereço e porta, pois os dados do navegador são separados por origem.

## Acesso de demonstração

Use `1234` como senha e dados fictícios.

| E-mail | Perfil |
| --- | --- |
| `solicitante@ufam.edu.br` | Solicitante |
| `carlos@ufam.edu.br` ou `tecnico@ufam.edu.br` | Técnico responsável |
| `mariana@ufam.edu.br` | Técnica colaboradora no chamado de exemplo |
| `joao@ufam.edu.br` | Técnico |
| `admin@ufam.edu.br` | Administrador |

O login reconhece os e-mails técnicos e administrativo de exemplo. Outros e-mails válidos abrem a área do solicitante. As contas de exemplo aceitam senhas de 4 a 8 caracteres. Técnicos criados na administração usam a senha cadastrada na demonstração.

O autocadastro valida os campos e retorna ao login com uma confirmação simulada. A criação real da conta depende da API. Para consultar alterações ao trocar de perfil, use o login na mesma aba.

## Recursos

- Solicitante — abertura em etapas, local e categoria ativos, imagem opcional, consulta, comentários, histórico e fotos.
- Técnico — busca, filtros, início pelo principal, conclusão com nota e foto opcional e consulta como colaborador.
- Administrador — painel, fila, filtros e totais, equipe do chamado, revisão de conflitos, contas técnicas, locais, categorias, comentários e anexos.

As filas têm páginas de 20 registros e ordenação pela última movimentação. Comentários preservam a movimentação do chamado. O histórico apresenta autoria nos novos eventos da demonstração e identifica eventos antigos sem autoria registrada.

Chamados concluídos têm equipe disponível para consulta. Cadastros vinculados têm exclusão bloqueada e podem ser desativados. A edição manual de equipe aceita técnicos cadastrados, inclusive indisponíveis para atribuição automática.

As imagens aceitam JPEG ou PNG de até 5 MiB. Após falha no anexo, os textos são preservados para nova tentativa ou envio sem imagem.

## Estrutura

```text
frontend/
├── assestes/          # Ilustrações SVG
├── css/               # Tokens e estilos
├── html/
│   ├── admin/
│   ├── solicitante/
│   └── tecnico/
├── js/
├── cadastro.html
├── index.html
└── login.html
tests/
└── contrato-frontend.test.cjs
```

A pasta de ilustrações se chama `assestes` no projeto atual. A administração usa `admin.html` com fragmentos como `#fila` e `#tecnicos`. Os padrões visuais estão em [DESIGN.md](DESIGN.md).

## Módulos JavaScript

| Arquivo em `frontend/js` | Responsabilidade |
| --- | --- |
| `acesso.js` | Formulários de acesso e encaminhamento por perfil. |
| `chamados.js` | Chamados, técnicos, catálogos e acesso às fotos no IndexedDB. |
| `registros.js` | Datas, comentários, dados legados, autoria e vínculos para exclusão. |
| `equipes.js` | Equipe, versão e revisão de conflito. |
| `chamado-ui.js` | Paginação, discussão, histórico, anexos e confirmação de exclusão. |
| `novo-chamado.js` | Etapas da abertura e imagem opcional. |
| `acompanhar.js` e `solicitante.js` | Listagem, detalhes, comentários e fotos do solicitante. |
| `tecnico.js` | Atendimento e colaboração. |
| `admin.js` | Navegação e telas administrativas. |

## Dados e integração

Chamados, comentários, catálogos, técnicos e perfis usam `sessionStorage`. As fotos usam IndexedDB. Recarregar preserva os dados da sessão. Abas têm sessões separadas, e os dados de sessão podem ser descartados ao encerrar a aba.

O conflito de equipe usa `equipe_versao`. A interface preserva o rascunho, apresenta a equipe atual e exige confirmação antes do reenvio. O cenário é exercitado localmente. A concorrência real entre administradores precisa ser validada com a API.

O contrato prevê o prefixo `/api/v1`, com recursos de autenticação, técnicos, locais, categorias, chamados, equipes, estados, comentários, histórico e anexos.

A integração deve substituir o armazenamento simulado por requisições, usar os UUIDs do servidor, enviar o token de sessão e tratar os erros previstos no contrato. O endereço da API será configurado nessa etapa.

Dependem do backend a autenticação real, autorização por perfil e vínculo, atribuição automática, PostgreSQL, transações, autoria obtida da sessão do servidor e validação real das imagens.

## Testes

Requer Node.js 22 ou superior. Execute a partir da raiz.

```bash
node --test tests/contrato-frontend.test.cjs
```

A suíte cobre comentários compartilhados, preservação de dados legados, ordenação, versões e reenvio de equipe, bloqueio após conclusão, vínculos de cadastros e autoria de novos eventos.

Para verificar no navegador, abra um chamado como solicitante, atribua um principal como administrador e entre como esse técnico para iniciar, comentar e concluir. Consulte a conclusão e a foto nos outros perfis. Confira também imagens acima de 5 MiB, cadastros vinculados e os fluxos em 360 e 1280 px com teclado.

A abertura aceita `?falha-foto=1` para simular falha no primeiro envio com imagem. Os testes deste repositório verificam o frontend. Endpoints, permissões, transações e persistência devem ser validados com o backend.

## Equipe

- Alejjandro Martins — especificação, modelagem, contrato da API, wireframes, frontend e integração das telas.
- Dieglison Varejão — backend Express, API, PostgreSQL, autenticação, permissões, atribuição automática e testes de endpoints.
- Ambos — revisão do contrato, documentação, testes integrados e apresentação.

## Licença

[MIT](LICENSE).
