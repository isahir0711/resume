---
layout: ../../layouts/MarkdownLayout.astro
title: "Result Pattern"
description: "Cómo implementar el patrón Result para el manejo de errores."
topic: "Mejores Prácticas"
date: "Jul 21, 2025"
---

# Patrón Result

El patrón Result es utilizado para tener una idea más clara del resultado de una operación, ya sea exitosa o fallida.

Uno de los beneficios es que ayuda a evitar utilizar Try-Catch para el manejo de los errores. El try-catch debería reservarse para situaciones (como lo dice su nombre) excepcionales y no para validaciones o errores que sabemos de antemano que pueden ocurrir (información incorrecta, permisos insuficientes, sin resultados).

Otro beneficio es tener un mejor control del flujo de la aplicación según el resultado de las operaciones y de esta forma realizar las acciones necesarias.

---

La forma en que normalmente lo implemento es la siguiente:

Una clase llamada Result que tiene un tipo genérico y 3 campos:

  - Value
  - IsSuccess
  - Error

El campo Value tendrá el resultado de la operación.

El campo IsSuccess es para determinar si la operación fue exitosa o no.

El campo Error contiene el mensaje de error.


### Clase Result

```csharp
public class Result<T>
{
  public T Value {get;}
  public bool IsSuccess {get;}
  public string Error {get;}
}

private Result(T value, string error, bool isSuccess)
{
  Value = value;
  Error = error;
  IsSuccess = isSuccess;
}

public static Result<T> Success(T value)
{
  return new Result<T>(value, null, true);
}
public static Result<T> Failure(string error)
{
  return new Result<T>(default, error, false);
}
```


### ¿Por qué default?

El uso de default es para regresar el valor por defecto de tu tipo especificado.

#### Por ejemplo

  > - int ---> 0
  > - string ----> null
  > - bool ----> false

Aquí puede haber un problema en caso de que tu tipo no tenga valor por defecto válido. Por ejemplo:

```csharp
// Problema con tipos que no tienen un "valor vacío" natural
public class User
{
    public string Username { get; set; }
    public string Email { get; set; }
}

// Si falla, ¿qué User deberíamos retornar?
var result = GetUser("invalid_id");
if (!result.IsSuccess)
{
    // result.Value será null para User
    // Esto está bien, pero podría ser confuso
    Console.WriteLine(result.Value?.Username); // null reference posible
}
```

**Solución:** Siempre verificar `IsSuccess` antes de usar `Value`:

```csharp
var result = GetUser("some_id");
if (result.IsSuccess)
{
    // Solo aquí es seguro usar result.Value
    Console.WriteLine($"Usuario: {result.Value.Username}");
}
else
{
    // En caso de error, NO acceder a result.Value
    Console.WriteLine($"Error: {result.Error}");
}
```


### Implementación

Este es un ejemplo sencillo del uso de este patrón. Podemos regresar al usuario (o loggear) el mensaje adecuado según el tipo de error, sin crear excepciones.

#### Servicio de Login

```csharp
public class UserService
{
    private readonly Dictionary<string, User> _users = new()
    {
        { "admin", new User { Username = "admin", Email = "admin@test.com" } },
        { "user1", new User { Username = "user1", Email = "user1@test.com" } }
    };

    public Result<User> Login(string username, string password)
    {
        if (string.IsNullOrEmpty(username))
            return Result<User>.Failure("El nombre de usuario no puede estar vacío");

        if (_users.TryGetValue(username, out var user))
            return Result<User>.Success(user);

        return Result<User>.Failure("Usuario no encontrado");
    }
}
```

#### Uso del Patrón Result

```csharp
public class Program
{
    public static void Main()
    {
        var userService = new UserService();

        // Ejemplo de login exitoso
        var loginResult = userService.Login("admin", "password");
        if (loginResult.IsSuccess)
        {
            Console.WriteLine($"Login exitoso: {loginResult.Value.Username}");
        }
        else
        {
            Console.WriteLine($"Error en login: {loginResult.Error}");
        }

    }
}
```

### Tipado de errores

Podemos explotar aún más el potencial de este patrón si también agregamos distintos tipos de errores, los cuales pueden hacer más sencillo manejar el flujo de la aplicación según el error.

Por ejemplo, creemos un enum llamado `ErrorType`.
Dentro de este enum listaremos los tipos de errores a manejar:

```csharp
public enum ErrorType
{
    None,
    NotFound,
    Unauthorized,
    ValidationError,
    DatabaseError,
    NetworkError
}
```

Con el enum creado podemos agregarlo a nuestra clase Result:

```csharp
public class Result<T>
{
  public T Value {get;}
  public bool IsSuccess {get;}
  public string Error {get;}
  //Agregamos el campo ErrorType
  public ErrorType ErrorType {get;}
}

private Result(T value, string error, bool isSuccess, ErrorType errorType)
{
  Value = value;
  Error = error;
  IsSuccess = isSuccess;
  //Agregamos el campo ErrorType
  ErrorType = errorType;
}

public static Result<T> Success(T value)
{
  return new Result<T>(value, null, true, ErrorType.None);
}
//Agregamos el parámetro errorType en el caso de error
public static Result<T> Failure(string error, ErrorType errorType)
{
  //Agregamos el parámetro errorType en el caso de error
  return new Result<T>(default, error, false, errorType);
}
```

De esta forma podremos, por ejemplo, regresar al cliente el código de estado correcto según nuestro tipo de error:


```csharp
public class ApiController
{
    public IActionResult HandleUserOperation()
    {
        var userService = new UserService();
        var result = userService.GetUser("someUserId");

        if (result.IsSuccess)
        {
            return Ok(result.Value);
        }

        // Manejo específico según el tipo de error
        return result.ErrorType switch
        {
            ErrorType.NotFound => NotFound(new { message = result.Error }),
            ErrorType.Unauthorized => Unauthorized(new { message = result.Error }),
            ErrorType.ValidationError => BadRequest(new { message = result.Error }),
            ErrorType.DatabaseError => StatusCode(500, new { message = "Error del servidor" }),
            ErrorType.NetworkError => StatusCode(503, new { message = "Servicio no disponible" }),
            _ => StatusCode(500, new { message = "Error desconocido" })
        };
    }

}
```

#### Ventajas del ErrorType:

1. **Código más limpio**: No necesitas analizar strings de error
2. **Manejo específico**: Cada tipo de error puede tener su propia lógica
3. **Códigos HTTP correctos**: Retornas el status code apropiado
4. **Logging diferenciado**: Puedes loggear según la severidad del error
5. **Mantenibilidad**: Cambios en mensajes no afectan la lógica de manejo


De esta forma es como normalmente manejo los errores. Quizás requiere agregar algo más de boilerplate, pero me ayuda a manejar el flujo de la aplicación de manera más sencilla.

Es posible utilizar las excepciones para el manejo de los errores; puede que sean más costosas en rendimiento, pero muy probablemente no es algo tan significativo como para que la aplicación se vea afectada.