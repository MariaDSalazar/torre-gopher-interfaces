# Torre Gopher

Juego breve para repasar las interfaces en Go (semanas 11 y 12 de Programación Orientada a Objetos). La torre
tiene 12 bloques y cada uno esconde una pregunta. Si se responde bien, el bloque sale y sube a la cima; si se falla,
la torre pierde un soporte y se tambalea. Con tres fallos se derrumba y se vuelve a armar.

## Temas

| Tema | Bloques |
|---|---|
| La interfaz (contrato y declaración) | 2 |
| Implementar una interfaz | 2 |
| Polimorfismo | 1 |
| La interfaz en UML (realización) | 1 |
| `fmt.Stringer` | 1 |
| La interfaz vacía `any` | 2 |
| Aserción de tipo | 1 |
| Type switch | 1 |
| Errores propios (`error`) | 1 |

Las preguntas con código se compilaron y ejecutaron con Go 1.27 al construir el juego: la respuesta correcta
coincide con la salida real del programa o con el mensaje real del compilador.

Al completar la torre aparece un informe por tema (aciertos al primer intento) y un certificado de completado con
el nombre del jugador. Solo se pide nombre y apellido; el progreso se guarda en el propio dispositivo. Las respuestas
no están en la página: se guarda su huella y la explicación va cifrada.

## Jugar

Se juega en https://mariadsalazar.github.io/torre-gopher-interfaces/.

## Ejecutar en local

Es un sitio estático. Desde la carpeta del repositorio:

```
python -m http.server 8000
```

y abrir `http://localhost:8000`.
