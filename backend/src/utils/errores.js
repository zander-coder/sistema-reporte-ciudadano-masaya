/* Error de la aplicación con código HTTP y mensaje seguro para el cliente. */
class ErrorApi extends Error {
  constructor(estado, codigo, mensaje, detalles) {
    super(mensaje);
    this.estado = estado;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}
const badRequest = (m, d) => new ErrorApi(400, 'DATOS_INVALIDOS', m, d);
const noAutorizado = (m = 'Debes iniciar sesión.') => new ErrorApi(401, 'NO_AUTORIZADO', m);
const noEncontrado = (m = 'Recurso no encontrado.') => new ErrorApi(404, 'NO_ENCONTRADO', m);

module.exports = { ErrorApi, badRequest, noAutorizado, noEncontrado };
