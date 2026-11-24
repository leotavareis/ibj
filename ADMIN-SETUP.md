# Área restrita — configuração (fazer uma vez só)

Este site é estático (HTML/CSS/JS), mas a área restrita (`/admin`) precisa de um
pequeno backend para funcionar: funções em `/api` (que rodam na Vercel) e um
espaço para guardar os eventos (Vercel Blob). Sem os passos abaixo, a tela de
login aparece, mas o login sempre falha.

A conexão que a Claude tem com a sua conta Vercel não tem permissão para criar
armazenamento nem configurar variáveis de ambiente — por isso estes passos
precisam ser feitos manualmente, uma única vez, direto no painel da Vercel.

**Importante:** os valores reais (e-mail, senha e a chave de sessão) nunca
devem ir para um arquivo deste repositório — ele é público no GitHub. Eles
ficam só no painel da Vercel, em Environment Variables, e foram te passados
separadamente no chat (não aqui no arquivo).

## 1. Criar o armazenamento (Vercel Blob)

1. Acesse https://vercel.com/dashboard → projeto **ibj-site**.
2. Vá em **Storage** → **Create Database** → **Blob**.
3. Dê um nome (ex: `ibj-eventos`) e clique em **Create**.
4. Quando perguntar a qual projeto conectar, selecione **ibj-site**.

Isso cria sozinho a variável `BLOB_READ_WRITE_TOKEN` no projeto — não precisa
copiar nada manualmente.

## 2. Variáveis de ambiente

Ainda no projeto **ibj-site**: **Settings** → **Environment Variables**. Adicione
estas três, marcando **Production**, **Preview** e **Development** nas três
(os valores de cada uma estão na mensagem do chat, não aqui):

| Nome | O que é |
|---|---|
| `ADMIN_EMAIL` | O e-mail de login da área restrita |
| `ADMIN_PASSWORD` | A senha de login da área restrita |
| `SESSION_SECRET` | Uma chave aleatória só pra assinar o cookie de login |

O `SESSION_SECRET` pode ser trocado por qualquer outro texto aleatório longo
que você preferir gerar — só não mude depois de configurado, porque isso
derruba quem já estava logado.

## 3. Publicar

Depois de salvar as variáveis, basta um novo deploy pegar elas (qualquer `git
push` no repositório já dispara um deploy novo na Vercel). Se quiser forçar
sem esperar, use **Deployments** → menu "..." no último deploy → **Redeploy**.

## Como usar o dia a dia

- Acesse `https://ibj-site-sand.vercel.app/admin/` (não tem link nenhum no
  menu do site de propósito — é só pra quem sabe o endereço).
- Entre com o e-mail e a senha configurados no passo 2.
- Cadastre eventos especiais (data, horário, título e local opcional). Eles
  aparecem automaticamente na seção "Nossa Agenda" do site, junto dos cultos
  fixos de domingo e quarta.
- Os cultos fixos de domingo e quarta **não** aparecem aqui — eles continuam
  sendo editados só no código (`js/main.js`, lista `SEMANAIS`), como já era.
- O login fica válido por 7 dias no navegador; depois disso, basta logar de
  novo.

## Se quiser trocar a senha depois

Basta editar o valor de `ADMIN_PASSWORD` nas Environment Variables da Vercel e
fazer um novo deploy. Não precisa mexer em nenhum arquivo do site.

## O que fazer se algo der errado

- **Login sempre diz "e-mail ou senha incorretos"**: confira se as 3 variáveis
  de ambiente foram salvas certinho (sem espaço sobrando) e se houve um
  deploy novo depois de salvá-las.
- **Login funciona mas "Adicionar evento" dá erro**: confira se o passo 1
  (Blob) foi feito e conectado ao projeto certo.
- Qualquer coisa, veja os logs em **Deployments** → deploy mais recente →
  **Functions** → clique em `/api/login` ou `/api/eventos` pra ver o erro
  exato.
