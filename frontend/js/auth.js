/* =========================================================
   MASAYA REPORTA — Inicio de sesión de funcionarios (JWT)
   ========================================================= */

(function(){
  if (api.auth.estaAutenticado()){
    window.location.href = 'admin.html';
    return;
  }

  $('#formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const boton = e.target.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await api.auth.login($('#usuario').value, $('#password').value);
      toast('Bienvenido/a.', 'ok');
      window.location.href = 'admin.html';
    } catch (err){
      toast(err.paraUsuario ? err.paraUsuario() : 'No se pudo iniciar sesión.', 'error');
    } finally {
      boton.disabled = false;
    }
  });
})();
