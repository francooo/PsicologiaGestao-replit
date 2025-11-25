# Correção da Mensagem de Erro de Upload de Imagem

## Arquivo a Modificar
`client/src/pages/profile.tsx`

## Localização
Linhas 97-106

## Código Atual
```typescript
const res = await fetch("/api/profile", {
  method: "POST",
  body: formData,
});

if (!res.ok) {
  throw new Error("Falha ao atualizar perfil");
}

return await res.json();
```

## Código Novo (Substituir)
```typescript
const res = await fetch("/api/profile", {
  method: "POST",
  body: formData,
});

if (!res.ok) {
  // Try to parse error message from response
  try {
    const errorData = await res.json();
    throw new Error(errorData.message || "Falha ao atualizar perfil");
  } catch (parseError) {
    // If JSON parsing fails, use generic message
    throw new Error("Falha ao atualizar perfil");
  }
}

return await res.json();
```

## O Que Fazer

1. Abra o arquivo `client/src/pages/profile.tsx`
2. Vá até a linha 97
3. Localize o bloco de código que faz o `fetch` para `/api/profile`
4. Substitua o bloco `if (!res.ok)` pelo novo código acima
5. Salve o arquivo

## Resultado

Após essa mudança, quando você tentar fazer upload de uma imagem com extensão inválida, verá a mensagem:

**"Apenas imagens nos formatos JPEG, JPG, PNG e GIF são permitidas."**

Em vez da mensagem genérica:

**"Falha ao atualizar perfil"**
