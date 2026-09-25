/* =========================================================
   MASAYA REPORTA — Autenticación (demo, JWT simulado)
   ========================================================= */

(function(){
  if (db.auth.estaAutenticado()){
    window.location.href = 'admin.html';
    return;
  }

  $('#formLogin').addEventListener('submit', (e) => {
    e.preventDefault();
    const usuario = $('#usuario').value;
    const password = $('#password').value;
    if (db.auth.login(usuario, password)){
      toast('Bienvenido/a.', 'ok');
      window.location.href = 'admin.html';
    } else {
      toast('Usuario o contraseña incorrectos.', 'error');
    }
  });
})();
