// =====================================================================
// SHIM: traduce las llamadas google.script.run(...) que ya existen en
// el codigo de abajo a fetch() reales contra la API de Apps Script.
// Esto evita tener que reescribir a mano cada una de las llamadas.
//
// IMPORTANTE: reemplaza la URL de aca abajo por la de TU implementacion
// de Apps Script (Implementar -> Administrar implementaciones -> copiar
// la URL que termina en /exec).
// =====================================================================
var APPS_SCRIPT_API_URL = 'https://script.google.com/macros/s/AKfycbxhDZ-P5RrJcgPrJVGfagZ8-S-44LQS49gNufhjwMROdFy9YNq974TGfilkucU9guvgpQ/exec';

function _crearLlamadaApi() {
  var successHandler = null;
  var failureHandler = null;

  var chain = {
    withSuccessHandler: function(fn) { successHandler = fn; return proxy; },
    withFailureHandler: function(fn) { failureHandler = fn; return proxy; }
  };

  var proxy = new Proxy(chain, {
    get: function(target, prop) {
      if (prop in target) return target[prop];
      // Cualquier otro nombre (getDatosIniciales, agregarMovimiento, etc.)
      // es la funcion real del backend que hay que invocar.
      return function() {
        var params = Array.prototype.slice.call(arguments);
        fetch(APPS_SCRIPT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ accion: prop, params: params })
        })
          .then(function(res) { return res.json(); })
          .then(function(data) {
            if (data.ok) {
              if (successHandler) successHandler(data.resultado);
            } else {
              if (failureHandler) failureHandler({ message: data.error });
              else console.error('Error de API (' + prop + '):', data.error);
            }
          })
          .catch(function(err) {
            if (failureHandler) failureHandler({ message: err.message });
            else console.error('Error de red (' + prop + '):', err);
          });
      };
    }
  });

  return proxy;
}

window.google = {
  script: {
    get run() { return _crearLlamadaApi(); }
  }
};

// =====================================================================
// A PARTIR DE ACA: tu codigo tal cual estaba, sin cambios
// =====================================================================

window.onerror = function(mensaje, url, linea, columna, error) {
    alert('Error inesperado en la app:\n' + mensaje + '\n(linea ' + linea + ')');
    return false;
  };

  var COLORES_CATEGORIA = {
    'Comida': '#0C447C', 'Delivery': '#BA7517', 'Bebidas sin alcohol': '#185FA5',
    'Bebidas con alcohol': '#A32D2D', 'Limpieza': '#0F6E56', 'Higiene personal': '#0F6E56',
    'Indumentaria': '#534AB7', 'Transporte': '#5F5E5A', 'Salidas/Ocio': '#993556',
    'Salud': '#0F6E56', 'Mascotas': '#854F0B', 'Hogar (varios)': '#444441',
    'Otros': '#5F5E5A', 'Vivienda': '#0C447C', 'Servicios': '#185FA5',
    'Seguros': '#3C3489', 'Suscripciones': '#534AB7', 'Educacion': '#712B13',
    'Creditos/Cuotas': '#791F1F', 'Plazo fijo': '#27500A', 'Dolares/USD': '#27500A',
    'Fondo comun de inversion': '#27500A', 'Cripto': '#27500A', 'Efectivo guardado': '#27500A',
    'Sueldo': '#0C447C', 'Extra/Freelance': '#0C447C', 'Otros ingresos': '#0C447C'
  };

  function formatearMonto(numero) {
    numero = Number(numero) || 0;
    return '$ ' + Math.round(numero).toLocaleString('es-AR');
  }

  function parsearMonto(valor) {
    if (!valor) return 0;
    var limpio = valor.toString().trim().replace(',', '.');
    return parseFloat(limpio) || 0;
  }

  function iniciales(nombre) {
    return (nombre || '?').trim().charAt(0).toUpperCase();
  }

  // ---------------------------------------------------------------
  // TEMA CLARO / OSCURO
  // ---------------------------------------------------------------
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    document.getElementById('iconoTema').textContent = tema === 'dark' ? 'light_mode' : 'dark_mode';
    localStorage.setItem('tema', tema);
  }

  function inicializarTema() {
    var guardado = localStorage.getItem('tema');
    if (guardado) {
      aplicarTema(guardado);
    } else {
      var prefiereOscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      aplicarTema(prefiereOscuro ? 'dark' : 'light');
    }
  }

  document.getElementById('btnTema').addEventListener('click', function() {
    var actual = document.documentElement.getAttribute('data-theme');
    aplicarTema(actual === 'dark' ? 'light' : 'dark');
  });

  // ---------------------------------------------------------------
  // CARGA DE DATOS INICIALES
  // ---------------------------------------------------------------
  function mostrarCargando(mostrar) {
    document.getElementById('vistaCargando').classList.toggle('visible', mostrar);
    document.getElementById('vistaInicio').style.display = mostrar ? 'none' : 'block';
  }

  var DATOS_APP = null;

  function cargarDashboard() {
    mostrarCargando(true);
    google.script.run
      .withSuccessHandler(function(datos) {
        DATOS_APP = datos;
        pintarDashboard(datos);
      })
      .withFailureHandler(mostrarError)
      .getDatosIniciales();
  }

  function mostrarError(error) {
    mostrarCargando(false);
    alert('No se pudo cargar la informacion: ' + (error.message || error));
  }

  function pintarDashboard(datos) {
    mostrarCargando(false);

    if (datos.errores && datos.errores.length) {
      alert('Algunas partes no cargaron bien:\n' + datos.errores.join('\n'));
    }

    var resumen = datos.resumenMesActual;
    var totalesTipo = resumen.totalesPorTipo || {};

    document.getElementById('montoNeto').textContent = formatearMonto(resumen.totalNeto);
    document.getElementById('detalleBruto').textContent =
      'Total pagado ' + formatearMonto(resumen.totalBruto) + ' · parte de otros ' + formatearMonto(resumen.totalTerceros);

    if (datos.pendienteCobro && datos.pendienteCobro > 0) {
      document.getElementById('cardPendienteCobro').style.display = 'block';
      document.getElementById('montoPendienteCobro').textContent = formatearMonto(datos.pendienteCobro);
    } else {
      document.getElementById('cardPendienteCobro').style.display = 'none';
    }

    var statsHtml =
      statCard('Fijos', totalesTipo['Fijo']) +
      statCard('Variables', totalesTipo['Variable']) +
      statCard('Ahorros', totalesTipo['Ahorro'], true) +
      statCard('Ingresos', totalesTipo['Ingreso'], true);
    document.getElementById('statsGrid').innerHTML = statsHtml;

    var categoriasOrdenadas = Object.keys(resumen.totalesPorCategoria || {})
      .map(function(nombre) { return { nombre: nombre, monto: resumen.totalesPorCategoria[nombre] }; })
      .sort(function(a, b) { return b.monto - a.monto; });

    var infoCategorias = {};
    (datos.categorias || []).forEach(function(c) { infoCategorias[c.Nombre] = c; });

    document.getElementById('listaCategorias').innerHTML = categoriasOrdenadas
      .slice(0, 6)
      .map(function(c) { return filaCategoria(c.nombre, c.monto, infoCategorias[c.nombre]); })
      .join('');
  }

  function statCard(label, monto, positivo) {
    return '<div class="stat-card">' +
      '<p class="stat-label">' + label + '</p>' +
      '<p class="stat-valor' + (positivo ? ' positivo' : '') + '">' + formatearMonto(monto) + '</p>' +
      '</div>';
  }

  function filaCategoria(nombre, monto, info) {
    var icono = (info && info.Icono) || 'category';
    var color = COLORES_CATEGORIA[nombre] || '#5F5E5A';
    return '<div class="fila-categoria">' +
      '<div class="icono-categoria" style="background:' + color + '22;">' +
        '<span class="material-symbols-rounded" style="color:' + color + ';">' + icono + '</span>' +
      '</div>' +
      '<span class="nombre">' + nombre + '</span>' +
      '<span class="monto">' + formatearMonto(monto) + '</span>' +
      '</div>';
  }

  function filaPersona(nombre, monto) {
    return '<div class="fila-persona">' +
      '<div class="avatar-persona">' + iniciales(nombre) + '</div>' +
      '<span class="nombre">' + nombre + '</span>' +
      '<span class="monto-deuda">' + formatearMonto(monto) + '</span>' +
      '</div>';
  }

  // ---------------------------------------------------------------
  // NAVEGACION: pestanas persistentes (inicio, personas, categorias)
  // vs overlays modales (agregar, escanear)
  // ---------------------------------------------------------------
  var tabActual = 'inicio';

  function capitalizar(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function mostrarTab(nombre) {
    document.querySelectorAll('.vista').forEach(function(v) { v.style.display = 'none'; });
    var el = document.getElementById('vista' + capitalizar(nombre));
    if (el) el.style.display = 'block';
    tabActual = nombre;
    document.querySelectorAll('.nav-item').forEach(function(b) {
      b.classList.toggle('activo', b.getAttribute('data-vista') === nombre);
    });
    if (nombre === 'grupos') cargarGruposTab();
    if (nombre === 'categorias') cargarCategoriasTab();
  }

  function cerrarOverlay() {
    document.getElementById('vistaAgregar').style.display = 'none';
    document.getElementById('vistaEscanear').style.display = 'none';
    document.getElementById('vistaDetalleGrupo').style.display = 'none';
    document.getElementById('vistaCuotas').style.display = 'none';
    document.getElementById('vistaCuentas').style.display = 'none';
    document.getElementById('vistaResumenGeneral').style.display = 'none';
    mostrarTab(tabActual);
  }

  document.querySelectorAll('.nav-item, .fab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var vista = btn.getAttribute('data-vista');
      if (vista === 'agregar') { abrirVistaAgregar(); return; }
      if (vista === 'escanear') { abrirVistaEscanear(); return; }
      mostrarTab(vista);
    });
  });

  // ---------------------------------------------------------------
  // VISTA: CARGA MANUAL DE GASTO
  // ---------------------------------------------------------------
  var estadoForm = {
    tipo: 'Variable',
    categoria: null,
    subcategoria: null,
    contextoModal: null // 'categoria' o 'subcategoria', para saber que hace el click en el modal
  };

  function abrirVistaAgregar() {
    document.querySelectorAll('.vista').forEach(function(v) { v.style.display = 'none'; });
    document.getElementById('vistaAgregar').style.display = 'block';

    estadoForm.tipo = 'Variable';
    estadoForm.categoria = null;
    estadoForm.subcategoria = null;
    estadoForm.cuentaId = null;

    document.querySelectorAll('.chip-tipo').forEach(function(c) {
      c.classList.toggle('activo', c.getAttribute('data-tipo') === estadoForm.tipo);
    });

    document.getElementById('textoCategoriaSel').textContent = 'Elegir categoria';
    document.getElementById('iconoCategoriaSel').textContent = 'category';
    document.getElementById('filaSubcategoria').style.display = 'none';
    document.getElementById('textoCuentaSel').textContent = 'Elegir cuenta';
    document.getElementById('iconoCuentaSel').textContent = 'account_balance';
    document.getElementById('checkRecurrente').checked = false;
    document.getElementById('inputMonto').value = '';
    document.getElementById('inputDescripcion').value = '';
    document.getElementById('inputComercio').value = '';
    document.getElementById('inputFecha').value = new Date().toISOString().slice(0, 10);
  }

  document.getElementById('btnCuenta').addEventListener('click', function() {
    abrirModalCuenta(function(id, nombre, icono) {
      estadoForm.cuentaId = id;
      document.getElementById('textoCuentaSel').textContent = nombre;
      document.getElementById('iconoCuentaSel').textContent = icono;
    });
  });

  document.getElementById('btnCerrarAgregar').addEventListener('click', cerrarOverlay);

  document.querySelectorAll('.chip-tipo').forEach(function(chip) {
    chip.addEventListener('click', function() {
      estadoForm.tipo = chip.getAttribute('data-tipo');
      document.querySelectorAll('.chip-tipo').forEach(function(c) { c.classList.remove('activo'); });
      chip.classList.add('activo');
      // al cambiar el tipo, la categoria elegida deja de tener sentido
      estadoForm.categoria = null;
      estadoForm.subcategoria = null;
      document.getElementById('textoCategoriaSel').textContent = 'Elegir categoria';
      document.getElementById('iconoCategoriaSel').textContent = 'category';
      document.getElementById('filaSubcategoria').style.display = 'none';
    });
  });

  // ---------------------------------------------------------------
  // MODAL SELECTOR DE CATEGORIA / SUBCATEGORIA (reutilizable)
  // ---------------------------------------------------------------
  function cerrarModal() {
    document.getElementById('modalSelector').style.display = 'none';
  }

  document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
  document.getElementById('modalSelector').addEventListener('click', function(e) {
    if (e.target.id === 'modalSelector') cerrarModal();
  });

  document.getElementById('btnCategoria').addEventListener('click', function() {
    abrirModalCategoria(estadoForm.tipo, function(nombre, icono) {
      estadoForm.categoria = nombre;
      estadoForm.subcategoria = null;
      document.getElementById('textoCategoriaSel').textContent = nombre;
      document.getElementById('iconoCategoriaSel').textContent = icono;

      var subcategorias = (DATOS_APP.categorias || [])
        .filter(function(c) { return c.Nombre === nombre && c.Subcategoria; });
      if (subcategorias.length > 0) {
        document.getElementById('filaSubcategoria').style.display = 'block';
        document.getElementById('textoSubcategoriaSel').textContent = 'Elegir subcategoria';
      } else {
        document.getElementById('filaSubcategoria').style.display = 'none';
      }
    });
  });

  document.getElementById('btnSubcategoria').addEventListener('click', function() {
    if (!estadoForm.categoria) return;
    abrirModalSubcategoria(estadoForm.categoria, function(sub) {
      estadoForm.subcategoria = sub;
      document.getElementById('textoSubcategoriaSel').textContent = sub;
    });
  });

  function abrirModalCategoria(tipo, callback) {
    var categorias = (DATOS_APP.categorias || []).filter(function(c) { return c.Tipo === tipo; });

    var vistas = {};
    categorias.forEach(function(c) {
      if (!vistas[c.Nombre]) vistas[c.Nombre] = c;
    });
    var lista = Object.values(vistas);

    document.getElementById('modalTitulo').textContent = 'Elegir categoria';
    document.getElementById('modalLista').innerHTML = lista.map(function(c) {
      var color = COLORES_CATEGORIA[c.Nombre] || '#5F5E5A';
      return '<div class="modal-item" data-nombre="' + c.Nombre + '" data-icono="' + c.Icono + '">' +
        '<div class="icono-categoria" style="background:' + color + '22;">' +
          '<span class="material-symbols-rounded" style="color:' + color + ';">' + c.Icono + '</span>' +
        '</div>' +
        '<span class="nombre">' + c.Nombre + '</span>' +
        '</div>';
    }).join('');

    document.querySelectorAll('#modalLista .modal-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var nombre = item.getAttribute('data-nombre');
        var icono = item.getAttribute('data-icono');
        cerrarModal();
        callback(nombre, icono);
      });
    });

    document.getElementById('modalSelector').style.display = 'flex';
  }

  function abrirModalSubcategoria(nombreCategoria, callback) {
    var subcategorias = (DATOS_APP.categorias || [])
      .filter(function(c) { return c.Nombre === nombreCategoria && c.Subcategoria; })
      .map(function(c) { return c.Subcategoria; });

    document.getElementById('modalTitulo').textContent = 'Elegir subcategoria';
    document.getElementById('modalLista').innerHTML = subcategorias.map(function(s) {
      return '<div class="modal-item" data-nombre="' + s + '">' +
        '<span class="nombre">' + s + '</span>' +
        '</div>';
    }).join('');

    document.querySelectorAll('#modalLista .modal-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var sub = item.getAttribute('data-nombre');
        cerrarModal();
        callback(sub);
      });
    });

    document.getElementById('modalSelector').style.display = 'flex';
  }
  // ---------------------------------------------------------------
  // SELECTOR DE CUENTA (reutiliza el mismo modal de categorias)
  // ---------------------------------------------------------------
  function abrirModalCuenta(callback) {
    var lista = DATOS_APP.cuentas || [];

    if (!lista.length) {
      alert('Todavia no cargaste ninguna cuenta. Anda a "Mis cuentas" desde el inicio para crear una.');
      return;
    }

    document.getElementById('modalTitulo').textContent = 'Elegir cuenta';
    document.getElementById('modalLista').innerHTML = lista.map(function(c) {
      return '<div class="modal-item" data-id="' + c.ID + '" data-nombre="' + escaparHtml(c.Nombre) + '" data-icono="' + c.Icono + '">' +
        '<div class="icono-categoria icono-cuenta" style="background:' + c.Color + '22;">' +
          '<span class="material-symbols-rounded" style="color:' + c.Color + ';">' + c.Icono + '</span>' +
        '</div>' +
        '<span class="nombre">' + escaparHtml(c.Nombre) + ' &middot; ' + formatearMonto(c.SaldoActual) + '</span>' +
        '</div>';
    }).join('');

    document.querySelectorAll('#modalLista .modal-item').forEach(function(item) {
      item.addEventListener('click', function() {
        var id = item.getAttribute('data-id');
        var nombre = item.getAttribute('data-nombre');
        var icono = item.getAttribute('data-icono');
        cerrarModal();
        callback(id, nombre, icono);
      });
    });

    document.getElementById('modalSelector').style.display = 'flex';
  }

  // ---------------------------------------------------------------
  // VISTA: ESCANEO DE TICKET
  // ---------------------------------------------------------------
  var estadoTicket = null;

  function escaparHtml(texto) {
    return (texto || '').toString()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function abrirVistaEscanear() {
    document.querySelectorAll('.vista').forEach(function(v) { v.style.display = 'none'; });
    document.getElementById('vistaEscanear').style.display = 'block';
    mostrarPanelTicket('elegir');
  }

  document.getElementById('btnCerrarEscanear').addEventListener('click', cerrarOverlay);

  function mostrarPanelTicket(panel) {
    document.getElementById('panelElegirFoto').style.display = panel === 'elegir' ? 'flex' : 'none';
    document.getElementById('panelCargandoTicket').style.display = panel === 'cargando' ? 'flex' : 'none';
    document.getElementById('panelConfirmarTicket').style.display = panel === 'confirmar' ? 'block' : 'none';
  }

  function leerArchivoComoBase64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result.split(',')[1]); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function manejarFotoSeleccionada(e) {
    var file = e.target.files[0];
    if (!file) return;

    mostrarPanelTicket('cargando');

    leerArchivoComoBase64(file).then(function(base64) {
      google.script.run
        .withSuccessHandler(function(resultado) {
          estadoTicket = resultado;
          estadoTicket.medioPago = 'Efectivo';
          poblarConfirmarTicket();
        })
        .withFailureHandler(function(error) {
          alert('No se pudo leer el ticket: ' + (error.message || error));
          mostrarPanelTicket('elegir');
        })
        .escanearTicket(base64, file.type);
    });

    e.target.value = '';
  }

  document.getElementById('inputFotoCamara').addEventListener('change', manejarFotoSeleccionada);
  document.getElementById('inputFotoGaleria').addEventListener('change', manejarFotoSeleccionada);

  function poblarConfirmarTicket() {
    document.getElementById('inputComercioTicket').value = estadoTicket.comercio || '';
    document.getElementById('inputFechaTicket').value = estadoTicket.fecha || new Date().toISOString().slice(0, 10);
    document.getElementById('selectMedioPagoTicket').value = estadoTicket.medioPago || 'Efectivo';
    estadoTicket.cuentaId = null;
    document.getElementById('textoCuentaTicketSel').textContent = 'Elegir cuenta';
    document.getElementById('iconoCuentaTicketSel').textContent = 'account_balance';

    estadoTicket.destino = 'mio';
    document.querySelectorAll('#chipsDestinoTicket .chip-tipo').forEach(function(c) {
      c.classList.toggle('activo', c.getAttribute('data-destino') === 'mio');
    });
    document.getElementById('filaGrupoTicket').style.display = 'none';
    estadoParticipantesTicket.disponibles = [];
    estadoParticipantesTicket.participantes = [];

    renderListaItemsTicket();
    mostrarPanelTicket('confirmar');
  }

  document.getElementById('btnCuentaTicket').addEventListener('click', function() {
    abrirModalCuenta(function(id, nombre, icono) {
      estadoTicket.cuentaId = id;
      document.getElementById('textoCuentaTicketSel').textContent = nombre;
      document.getElementById('iconoCuentaTicketSel').textContent = icono;
    });
  });

  function actualizarTotalItemsTicket() {
    var total = estadoTicket.items.reduce(function(sum, i) { return sum + (Number(i.monto) || 0); }, 0);
    document.getElementById('totalItemsTicket').textContent = formatearMonto(total);
  }

  function renderListaItemsTicket() {
    var infoCategorias = {};
    (DATOS_APP.categorias || []).forEach(function(c) { infoCategorias[c.Nombre] = c; });

    document.getElementById('listaItemsTicket').innerHTML = estadoTicket.items.map(function(item, index) {
      var color = COLORES_CATEGORIA[item.categoria] || '#5F5E5A';
      var icono = (infoCategorias[item.categoria] && infoCategorias[item.categoria].Icono) || 'category';
      var textoCategoria = item.categoria
        ? (item.subcategoria ? item.categoria + ' - ' + item.subcategoria : item.categoria)
        : 'Elegir categoria';

      return '<div class="item-ticket" data-index="' + index + '">' +
        '<div class="item-ticket-top">' +
          '<input type="text" class="item-descripcion" data-index="' + index + '" value="' + escaparHtml(item.descripcion) + '">' +
          '<button type="button" class="btn-borrar-item" data-index="' + index + '" aria-label="Quitar item">' +
            '<span class="material-symbols-rounded icon-sm">delete</span>' +
          '</button>' +
        '</div>' +
        '<div class="item-ticket-bottom">' +
          '<input type="text" inputmode="decimal" class="item-monto" data-index="' + index + '" value="' + item.monto + '">' +
          '<button type="button" class="campo-selector item-categoria-btn" data-index="' + index + '">' +
            '<span class="material-symbols-rounded selector-icono" style="color:' + color + ';">' + icono + '</span>' +
            '<span class="selector-texto">' + textoCategoria + '</span>' +
            '<span class="material-symbols-rounded selector-chevron">chevron_right</span>' +
          '</button>' +
        '</div>' +
        '</div>';
    }).join('');

    document.querySelectorAll('.item-descripcion').forEach(function(input) {
      input.addEventListener('input', function() {
        estadoTicket.items[Number(input.getAttribute('data-index'))].descripcion = input.value;
      });
    });

    document.querySelectorAll('.item-monto').forEach(function(input) {
      input.addEventListener('input', function() {
        estadoTicket.items[Number(input.getAttribute('data-index'))].monto = parsearMonto(input.value);
        actualizarTotalItemsTicket();
      });
    });

    document.querySelectorAll('.btn-borrar-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        estadoTicket.items.splice(Number(btn.getAttribute('data-index')), 1);
        renderListaItemsTicket();
        actualizarTotalItemsTicket();
      });
    });

    document.querySelectorAll('.item-categoria-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var index = Number(btn.getAttribute('data-index'));
        abrirModalCategoria('Variable', function(nombre, icono) {
          estadoTicket.items[index].categoria = nombre;
          estadoTicket.items[index].subcategoria = '';

          var subcategorias = (DATOS_APP.categorias || [])
            .filter(function(c) { return c.Nombre === nombre && c.Subcategoria; });

          if (subcategorias.length > 0) {
            abrirModalSubcategoria(nombre, function(sub) {
              estadoTicket.items[index].subcategoria = sub;
              renderListaItemsTicket();
            });
          } else {
            renderListaItemsTicket();
          }
        });
      });
    });

    actualizarTotalItemsTicket();
  }

  document.getElementById('btnAgregarItemTicket').addEventListener('click', function() {
    estadoTicket.items.push({ descripcion: '', monto: 0, categoria: '', subcategoria: '' });
    renderListaItemsTicket();
  });

  document.getElementById('formAgregar').addEventListener('submit', function(e) {
    e.preventDefault();

    var monto = parsearMonto(document.getElementById('inputMonto').value);
    if (!monto || monto <= 0) { alert('Ingresa un monto valido.'); return; }
    if (!estadoForm.categoria) { alert('Elegi una categoria.'); return; }
    if (!estadoForm.cuentaId) { alert('Elegi una cuenta.'); return; }

    var datos = {
      fecha: document.getElementById('inputFecha').value,
      tipo: estadoForm.tipo,
      categoria: estadoForm.categoria,
      subcategoria: estadoForm.subcategoria || '',
      comercio: document.getElementById('inputComercio').value,
      descripcion: document.getElementById('inputDescripcion').value || estadoForm.categoria,
      monto: monto,
      medioPago: document.getElementById('selectMedioPago').value,
      recurrente: document.getElementById('checkRecurrente').checked,
      cuentaId: estadoForm.cuentaId
    };

    var btnGuardar = document.getElementById('btnGuardarGasto');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    google.script.run
      .withSuccessHandler(function() {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar gasto';
        cerrarOverlay();
        cargarDashboard();
      })
      .withFailureHandler(function(error) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar gasto';
        alert('No se pudo guardar: ' + (error.message || error));
      })
      .agregarMovimiento(datos);
  });

  document.getElementById('btnGuardarTicket').addEventListener('click', function() {
    if (!estadoTicket.items.length) { alert('No hay items para guardar.'); return; }

    var sinCategoria = estadoTicket.items.some(function(i) { return !i.categoria; });
    if (sinCategoria) { alert('Todos los items necesitan una categoria.'); return; }

    var sinMonto = estadoTicket.items.some(function(i) { return !i.monto || i.monto <= 0; });
    if (sinMonto) { alert('Todos los items necesitan un monto valido.'); return; }

    if (!estadoTicket.cuentaId) { alert('Elegi una cuenta.'); return; }

    var btnGuardar = document.getElementById('btnGuardarTicket');

    if (estadoTicket.destino === 'grupo') {
      var grupoId = document.getElementById('selectGrupoTicket').value;
      if (!grupoId) { alert('Elegi un grupo.'); return; }
      if (!estadoParticipantesTicket.participantes.length) { alert('Elegi al menos un participante.'); return; }

      var totalTicket = estadoTicket.items.reduce(function(s, i) { return s + (Number(i.monto) || 0); }, 0);
      var totalAsignado = estadoParticipantesTicket.participantes.reduce(function(s, p) { return s + (Number(p.monto) || 0); }, 0);
      if (Math.abs(totalAsignado - totalTicket) > 1) {
        alert('Los montos asignados (' + formatearMonto(totalAsignado) + ') no coinciden con el total (' + formatearMonto(totalTicket) + ').');
        return;
      }

      var participantesPorcentaje = estadoParticipantesTicket.participantes.map(function(p) {
        return { personaId: p.id, porcentaje: totalTicket > 0 ? (p.monto / totalTicket * 100) : 0 };
      });

      var payloadGrupo = {
        comercio: document.getElementById('inputComercioTicket').value,
        fecha: document.getElementById('inputFechaTicket').value,
        medioPago: document.getElementById('selectMedioPagoTicket').value,
        cuentaId: estadoTicket.cuentaId,
        items: estadoTicket.items.map(function(i) {
          return {
            descripcion: i.descripcion || i.categoria,
            monto: i.monto,
            categoria: i.categoria,
            subcategoria: i.subcategoria || ''
          };
        })
      };

      btnGuardar.disabled = true;
      btnGuardar.textContent = 'Guardando...';

      google.script.run
        .withSuccessHandler(function() {
          btnGuardar.disabled = false;
          btnGuardar.textContent = 'Guardar ticket';
          cerrarOverlay();
          cargarDashboard();
        })
        .withFailureHandler(function(error) {
          btnGuardar.disabled = false;
          btnGuardar.textContent = 'Guardar ticket';
          alert('No se pudo guardar el ticket: ' + (error.message || error));
        })
        .guardarTicketComoGrupo(payloadGrupo, grupoId, participantesPorcentaje);
      return;
    }

    var payload = {
      comercio: document.getElementById('inputComercioTicket').value,
      fecha: document.getElementById('inputFechaTicket').value,
      medioPago: document.getElementById('selectMedioPagoTicket').value,
      cuentaId: estadoTicket.cuentaId,
      items: estadoTicket.items.map(function(i) {
        return {
          descripcion: i.descripcion || i.categoria,
          monto: i.monto,
          categoria: i.categoria,
          subcategoria: i.subcategoria || ''
        };
      })
    };

    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    google.script.run
      .withSuccessHandler(function() {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar ticket';
        cerrarOverlay();
        cargarDashboard();
      })
      .withFailureHandler(function(error) {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar ticket';
        alert('No se pudo guardar el ticket: ' + (error.message || error));
      })
      .guardarTicket(payload);
  });

  // ---------------------------------------------------------------
  // VISTA: GRUPOS DE GASTO
  // ---------------------------------------------------------------
  var grupoActualId = null;
  var estadoDetalleGrupo = null;
  var estadoNuevoGasto = null;
  var liquidacionActual = null;

  function formatearFecha(fecha) {
    if (!fecha) return '';
    var d = new Date(fecha);
    if (isNaN(d)) return fecha;
    return d.toLocaleDateString('es-AR');
  }

  function _nombreParaMostrar(personaId) {
    if (personaId === 'YO') return 'Yo';
    var persona = (DATOS_APP.personas || []).find(function(p) { return p.ID === personaId; });
    return persona ? persona.Nombre : 'Desconocido';
  }

  function cargarGruposTab() {
    document.getElementById('listaGruposTab').innerHTML =
      '<div class="vista-cargando visible" style="padding:30px 0;"><span class="material-symbols-rounded icon-spin">progress_activity</span></div>';
    google.script.run.withSuccessHandler(renderGruposTab).withFailureHandler(mostrarError).getGrupos(true);
  }

  function renderGruposTab(lista) {
    if (!lista.length) {
      document.getElementById('listaGruposTab').innerHTML =
        '<p class="label-muted" style="text-align:center;padding:30px 0;">Todavia no creaste ningun grupo. Toca el + de arriba para armar uno.</p>';
      return;
    }

    document.getElementById('listaGruposTab').innerHTML = lista.map(function(g) {
      return '<div class="card-grupo" data-id="' + g.ID + '">' +
        '<div class="icono-categoria"><span class="material-symbols-rounded">groups</span></div>' +
        '<div style="flex:1;">' +
          '<p class="nombre-persona">' + escaparHtml(g.Nombre) + '</p>' +
          '<p class="detalle-chico-persona">' + formatearFecha(g.Fecha) + '</p>' +
        '</div>' +
        '<button type="button" class="btn-borrar-grupo" data-id="' + g.ID + '" data-nombre="' + escaparHtml(g.Nombre) + '" aria-label="Eliminar grupo">' +
          '<span class="material-symbols-rounded icon-sm">delete</span>' +
        '</button>' +
        '<span class="material-symbols-rounded selector-chevron">chevron_right</span>' +
        '</div>';
    }).join('');

    document.querySelectorAll('.card-grupo').forEach(function(card) {
      card.addEventListener('click', function() { abrirDetalleGrupo(card.getAttribute('data-id')); });
    });

    document.querySelectorAll('.btn-borrar-grupo').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var nombre = btn.getAttribute('data-nombre');
        var id = btn.getAttribute('data-id');
        mostrarConfirmacion('¿Eliminar todo el grupo "' + nombre + '"? Esto borra tambien sus gastos y movimientos asociados.', function() {
          google.script.run
            .withSuccessHandler(function() { cargarGruposTab(); cargarDashboard(); })
            .withFailureHandler(mostrarError)
            .eliminarGrupo(id);
        });
      });
    });
  }

  document.getElementById('btnNuevoGrupo').addEventListener('click', function() {
    document.getElementById('inputNombreGrupo').value = '';
    document.getElementById('inputFechaGrupo').value = new Date().toISOString().slice(0, 10);
    document.getElementById('modalNuevoGrupo').style.display = 'flex';
  });

  document.getElementById('btnCerrarModalGrupo').addEventListener('click', function() {
    document.getElementById('modalNuevoGrupo').style.display = 'none';
  });
  document.getElementById('modalNuevoGrupo').addEventListener('click', function(e) {
    if (e.target.id === 'modalNuevoGrupo') e.target.style.display = 'none';
  });

  document.getElementById('btnGuardarGrupo').addEventListener('click', function() {
    var nombre = document.getElementById('inputNombreGrupo').value.trim();
    if (!nombre) { alert('Ingresa un nombre.'); return; }

    google.script.run
      .withSuccessHandler(function() {
        document.getElementById('modalNuevoGrupo').style.display = 'none';
        cargarGruposTab();
      })
      .withFailureHandler(function(error) { alert('No se pudo crear el grupo: ' + (error.message || error)); })
      .crearGrupo(nombre, document.getElementById('inputFechaGrupo').value);
  });

  // ---------------------------------------------------------------
  // DETALLE DE UN GRUPO (saldos, sugerencias de pago, gastos)
  // ---------------------------------------------------------------
  function abrirDetalleGrupo(grupoId) {
    grupoActualId = grupoId;
    document.querySelectorAll('.vista').forEach(function(v) { v.style.display = 'none'; });
    document.getElementById('vistaDetalleGrupo').style.display = 'block';
    cargarDetalleGrupo();
  }

  document.getElementById('btnCerrarDetalleGrupo').addEventListener('click', cerrarOverlay);

  function cargarDetalleGrupo() {
    document.getElementById('listaSaldosGrupo').innerHTML =
      '<div class="vista-cargando visible" style="padding:20px 0;"><span class="material-symbols-rounded icon-spin">progress_activity</span></div>';
    google.script.run
      .withSuccessHandler(function(detalle) {
        estadoDetalleGrupo = detalle;
        renderDetalleGrupo();
      })
      .withFailureHandler(mostrarError)
      .getDetalleGrupo(grupoActualId);
  }

  function renderDetalleGrupo() {
    var detalle = estadoDetalleGrupo;
    document.getElementById('tituloDetalleGrupo').textContent = detalle.grupo.Nombre;

    document.getElementById('listaSaldosGrupo').innerHTML = (detalle.balances.map(function(b) {
      var clase = b.saldo > 0.5 ? 'saldo-favor' : (b.saldo < -0.5 ? 'saldo-debe' : 'saldo-neutro');
      var texto = b.saldo > 0.5 ? ('le deben ' + formatearMonto(b.saldo))
        : (b.saldo < -0.5 ? ('debe ' + formatearMonto(-b.saldo)) : 'esta al dia');
      return '<div class="fila-saldo">' +
        '<span class="nombre-persona">' + escaparHtml(b.nombre) + '</span>' +
        '<span class="' + clase + '">' + texto + '</span>' +
        '</div>';
    }).join('')) || '<p class="label-muted">Sin gastos cargados todavia.</p>';

    if (detalle.transaccionesSugeridas.length) {
      document.getElementById('seccionSugeridas').style.display = 'block';
      document.getElementById('listaSugeridasGrupo').innerHTML = detalle.transaccionesSugeridas.map(function(t, i) {
        return '<div class="fila-sugerida">' +
          '<span class="nombre-persona" style="flex:1;">' + escaparHtml(t.deNombre) + ' &rarr; ' + escaparHtml(t.aNombre) + '</span>' +
          '<span class="monto" style="margin-right:6px;">' + formatearMonto(t.monto) + '</span>' +
          '<button type="button" class="btn-pago-chico" data-index="' + i + '">Marcar pagado</button>' +
          '</div>';
      }).join('');

      document.querySelectorAll('#listaSugeridasGrupo .btn-pago-chico').forEach(function(btn) {
        btn.addEventListener('click', function() {
          abrirModalLiquidacion(detalle.transaccionesSugeridas[Number(btn.getAttribute('data-index'))]);
        });
      });
    } else {
      document.getElementById('seccionSugeridas').style.display = 'none';
    }

    document.getElementById('listaGastosGrupo').innerHTML = (detalle.gastos.map(function(g) {
      return '<div class="fila-gasto-grupo" data-id="' + g.ID + '">' +
        '<div style="flex:1;">' +
          '<p class="nombre-persona" style="font-weight:400;">' + escaparHtml(g.Descripcion) + '</p>' +
          '<p class="detalle-chico-persona">Pago ' + escaparHtml(_nombreParaMostrar(g.PagadoPor)) + '</p>' +
        '</div>' +
        '<span class="monto" style="margin-right:6px;">' + formatearMonto(g.Monto) + '</span>' +
        '<button type="button" class="btn-borrar-item" data-id="' + g.ID + '" aria-label="Eliminar gasto">' +
          '<span class="material-symbols-rounded icon-sm">delete</span>' +
        '</button>' +
        '</div>';
    }).join('')) || '<p class="label-muted">Todavia no hay gastos en este grupo.</p>';

    document.querySelectorAll('#listaGastosGrupo .btn-borrar-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        mostrarConfirmacion('¿Eliminar este gasto del grupo?', function() {
          google.script.run
            .withSuccessHandler(function() { cargarDetalleGrupo(); cargarDashboard(); })
            .withFailureHandler(mostrarError)
            .eliminarGastoGrupo(btn.getAttribute('data-id'));
        });
      });
    });
  }

  document.getElementById('btnEliminarGrupo').addEventListener('click', function() {
    mostrarConfirmacion('¿Eliminar todo el grupo "' + estadoDetalleGrupo.grupo.Nombre + '"? Esto borra tambien sus gastos y movimientos asociados.', function() {
      google.script.run
        .withSuccessHandler(function() {
          cerrarOverlay();
          cargarDashboard();
        })
        .withFailureHandler(mostrarError)
        .eliminarGrupo(grupoActualId);
    });
  });

  // ---------------------------------------------------------------
  // MODAL DE CONFIRMACION GENERICO (reemplaza el confirm() nativo)
  // ---------------------------------------------------------------
  var confirmacionCallback = null;

  function mostrarConfirmacion(mensaje, callback) {
    document.getElementById('mensajeModalConfirmar').textContent = mensaje;
    confirmacionCallback = callback;
    document.getElementById('modalConfirmar').style.display = 'flex';
  }

  document.getElementById('btnCerrarModalConfirmar').addEventListener('click', function() {
    document.getElementById('modalConfirmar').style.display = 'none';
    confirmacionCallback = null;
  });
  document.getElementById('modalConfirmar').addEventListener('click', function(e) {
    if (e.target.id === 'modalConfirmar') {
      e.target.style.display = 'none';
      confirmacionCallback = null;
    }
  });

  document.getElementById('btnConfirmarAccion').addEventListener('click', function() {
    document.getElementById('modalConfirmar').style.display = 'none';
    var callback = confirmacionCallback;
    confirmacionCallback = null;
    if (callback) callback();
  });

  // ---------------------------------------------------------------
  // VISTA: CUOTAS A FUTURO
  // ---------------------------------------------------------------
  var NOMBRES_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var categoriaCompraCuotas = null;
  var cuotaSeleccionada = null;

  document.getElementById('btnVerCuotas').addEventListener('click', function() {
    document.querySelectorAll('.vista').forEach(function(v) { v.style.display = 'none'; });
    document.getElementById('vistaCuotas').style.display = 'block';
    cargarCuotas();
  });

  document.getElementById('btnCerrarCuotas').addEventListener('click', cerrarOverlay);

  function cargarCuotas() {
    document.getElementById('textoRecargoActual').textContent = (DATOS_APP.recargoCuotas || 0) + '%';
    document.getElementById('listaComprasCuotas').innerHTML =
      '<div class="vista-cargando visible" style="padding:20px 0;"><span class="material-symbols-rounded icon-spin">progress_activity</span></div>';
    document.getElementById('listaCuotas').innerHTML = '';

    google.script.run.withSuccessHandler(renderComprasCuotas).withFailureHandler(mostrarError).getComprasCuotas(true);
    google.script.run.withSuccessHandler(renderCuotas).withFailureHandler(mostrarError).getProyeccionCuotas(6);
  }

  document.getElementById('btnConfigRecargo').addEventListener('click', function() {
    document.getElementById('inputConfigRecargo').value = DATOS_APP.recargoCuotas || 0;
    document.getElementById('modalConfigRecargo').style.display = 'flex';
  });

  document.getElementById('btnCerrarModalRecargo').addEventListener('click', function() {
    document.getElementById('modalConfigRecargo').style.display = 'none';
  });
  document.getElementById('modalConfigRecargo').addEventListener('click', function(e) {
    if (e.target.id === 'modalConfigRecargo') e.target.style.display = 'none';
  });

  document.getElementById('btnGuardarRecargo').addEventListener('click', function() {
    var porcentaje = parsearMonto(document.getElementById('inputConfigRecargo').value);
    google.script.run
      .withSuccessHandler(function() {
        DATOS_APP.recargoCuotas = porcentaje;
        document.getElementById('modalConfigRecargo').style.display = 'none';
        cargarCuotas();
      })
      .withFailureHandler(function(error) { alert('No se pudo guardar: ' + (error.message || error)); })
      .setRecargoCuotas(porcentaje);
  });

  function renderComprasCuotas(compras) {
    if (!compras.length) {
      document.getElementById('listaComprasCuotas').innerHTML =
        '<p class="label-muted" style="padding:10px 0;">Todavia no cargaste ninguna compra en cuotas.</p>';
      return;
    }

    document.getElementById('listaComprasCuotas').innerHTML = compras.map(function(c) {
      var restantes = c.CantidadCuotas - c.CuotaInicial + 1;
      var progreso = Math.round((c.CuotasPagadas / restantes) * 100);
      return '<div class="card-compra-cuota" data-id="' + c.ID + '">' +
        '<div class="card-compra-cuota-top">' +
          '<div>' +
            '<p class="nombre-compra">' + escaparHtml(c.Descripcion) + '</p>' +
            '<p class="detalle-compra">' + escaparHtml(c.Categoria) + ' &middot; ' + formatearMonto(c.MontoCuota) + '/cuota</p>' +
          '</div>' +
          '<button type="button" class="btn-borrar-item" data-id="' + c.ID + '" aria-label="Eliminar compra">' +
            '<span class="material-symbols-rounded icon-sm">delete</span>' +
          '</button>' +
        '</div>' +
        '<div class="barra-progreso-cuotas"><div class="barra-progreso-cuotas-fill" style="width:' + progreso + '%;"></div></div>' +
        '<p class="detalle-compra" style="margin-top:4px;">' + c.CuotasPagadas + ' de ' + restantes + ' cuotas pagadas</p>' +
        '</div>';
    }).join('');

    document.querySelectorAll('#listaComprasCuotas .btn-borrar-item').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var id = btn.getAttribute('data-id');
        mostrarConfirmacion('¿Eliminar esta compra en cuotas? Las cuotas ya marcadas como pagadas quedan en tu historial igual.', function() {
          google.script.run.withSuccessHandler(cargarCuotas).withFailureHandler(mostrarError).eliminarCompraCuotas(id);
        });
      });
    });
  }

  function renderCuotas(meses) {
    var hayAlgo = meses.some(function(m) { return m.detalle.length > 0; });

    if (!hayAlgo) {
      document.getElementById('listaCuotas').innerHTML =
        '<p class="label-muted" style="text-align:center;padding:20px 0;">No tenes cuotas proyectadas por ahora.</p>';
      return;
    }

    document.getElementById('listaCuotas').innerHTML = meses.map(function(m, i) {
      var nombreMes = NOMBRES_MES[m.mes - 1] + ' ' + m.anio;
      var detalleHtml = m.detalle.map(function(d) {
        var accion = d.pagada
          ? '<span class="badge-pagada">Pagada</span>'
          : '<button type="button" class="btn-pagar-cuota" data-compraid="' + d.compraId + '" data-numero="' + d.numeroCuota + '" data-monto="' + d.monto + '">Pagar</button>';
        return '<div class="fila-cuota-detalle">' +
          '<div>' +
            '<p class="descripcion-cuota">' + escaparHtml(d.descripcion) + '</p>' +
            '<p class="numero-cuota">Cuota ' + d.numeroCuota + ' de ' + d.deCuotas + ' &middot; ' + escaparHtml(d.categoria) + '</p>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            '<span class="monto-cuota">' + formatearMonto(d.monto) + '</span>' +
            accion +
          '</div>' +
          '</div>';
      }).join('') || '<p class="label-muted" style="padding:8px 0;">Sin cuotas este mes.</p>';

      return '<div class="card-mes-cuota">' +
        '<div class="card-mes-cuota-header" data-index="' + i + '">' +
          '<p class="mes-nombre">' + nombreMes + '</p>' +
          '<span class="mes-total">' + formatearMonto(m.total) + '</span>' +
        '</div>' +
        '<div class="detalle-cuotas-mes" id="detalleCuotaMes-' + i + '" style="display:' + (i === 0 ? 'block' : 'none') + ';">' +
          detalleHtml +
        '</div>' +
        '</div>';
    }).join('');

    document.querySelectorAll('.card-mes-cuota-header').forEach(function(header) {
      header.addEventListener('click', function() {
        var detalle = document.getElementById('detalleCuotaMes-' + header.getAttribute('data-index'));
        detalle.style.display = detalle.style.display === 'block' ? 'none' : 'block';
      });
    });

    document.querySelectorAll('.btn-pagar-cuota').forEach(function(btn) {
      btn.addEventListener('click', function() {
        cuotaSeleccionada = {
          compraId: btn.getAttribute('data-compraid'),
          numeroCuota: btn.getAttribute('data-numero')
        };
        document.getElementById('inputMontoPagoCuota').value = btn.getAttribute('data-monto');
        document.getElementById('inputFechaPagoCuota').value = new Date().toISOString().slice(0, 10);
        cuotaSeleccionada.cuentaId = null;
        document.getElementById('textoCuentaPagoCuotaSel').textContent = 'Elegir cuenta';
        document.getElementById('iconoCuentaPagoCuotaSel').textContent = 'account_balance';
        document.getElementById('modalPagoCuota').style.display = 'flex';
      });
    });
  }

  document.getElementById('btnCuentaPagoCuota').addEventListener('click', function() {
    abrirModalCuenta(function(id, nombre, icono) {
      cuotaSeleccionada.cuentaId = id;
      document.getElementById('textoCuentaPagoCuotaSel').textContent = nombre;
      document.getElementById('iconoCuentaPagoCuotaSel').textContent = icono;
    });
  });

  document.getElementById('btnCerrarModalPagoCuota').addEventListener('click', function() {
    document.getElementById('modalPagoCuota').style.display = 'none';
  });
  document.getElementById('modalPagoCuota').addEventListener('click', function(e) {
    if (e.target.id === 'modalPagoCuota') e.target.style.display = 'none';
  });

  document.getElementById('btnConfirmarPagoCuota').addEventListener('click', function() {
    var monto = parsearMonto(document.getElementById('inputMontoPagoCuota').value);
    if (!monto || monto <= 0) { alert('Ingresa un monto valido.'); return; }
    if (!cuotaSeleccionada.cuentaId) { alert('Elegi una cuenta.'); return; }

    google.script.run
      .withSuccessHandler(function() {
        document.getElementById('modalPagoCuota').style.display = 'none';
        cargarCuotas();
        cargarDashboard();
      })
      .withFailureHandler(function(error) { alert('No se pudo registrar el pago: ' + (error.message || error)); })
      .marcarCuotaPagada(cuotaSeleccionada.compraId, Number(cuotaSeleccionada.numeroCuota), monto, document.getElementById('inputFechaPagoCuota').value, cuotaSeleccionada.cuentaId);
  });

  // ---------------------------------------------------------------
  // NUEVA COMPRA EN CUOTAS
  // ---------------------------------------------------------------
  document.getElementById('btnNuevaCompraCuotas').addEventListener('click', function() {
    document.getElementById('inputDescripcionCompraCuotas').value = '';
    document.getElementById('inputMontoTotalCompraCuotas').value = '';
    document.getElementById('inputCantidadCuotasCompra').value = '';
    document.getElementById('inputCuotaInicialCompra').value = '1';
    document.getElementById('inputMesPrimeraCuotaCompra').value = new Date().toISOString().slice(0, 7);
    document.getElementById('textoCategoriaCompraCuotas').textContent = 'Elegir categoria';
    document.getElementById('iconoCategoriaCompraCuotas').textContent = 'category';
    document.getElementById('previewMontoCuotaCompra').textContent = '';
    categoriaCompraCuotas = null;
    document.getElementById('modalNuevaCompraCuotas').style.display = 'flex';
  });

  document.getElementById('btnCategoriaCompraCuotas').addEventListener('click', function() {
    abrirModalCategoria('Variable', function(nombre, icono) {
      categoriaCompraCuotas = nombre;
      document.getElementById('textoCategoriaCompraCuotas').textContent = nombre;
      document.getElementById('iconoCategoriaCompraCuotas').textContent = icono;
    });
  });

  function actualizarPreviewCuotaCompra() {
    var total = parsearMonto(document.getElementById('inputMontoTotalCompraCuotas').value);
    var recargo = DATOS_APP.recargoCuotas || 0;
    var cantidad = Number(document.getElementById('inputCantidadCuotasCompra').value) || 0;
    if (!total || !cantidad) { document.getElementById('previewMontoCuotaCompra').textContent = ''; return; }
    var totalConRecargo = total * (1 + recargo / 100);
    var montoCuota = totalConRecargo / cantidad;
    document.getElementById('previewMontoCuotaCompra').textContent = 'Cada cuota: ' + formatearMonto(montoCuota) +
      ' (con recargo del ' + recargo + '%: total ' + formatearMonto(totalConRecargo) + ')';
  }

  ['inputMontoTotalCompraCuotas', 'inputCantidadCuotasCompra'].forEach(function(id) {
    document.getElementById(id).addEventListener('input', actualizarPreviewCuotaCompra);
  });

  document.getElementById('btnCerrarModalCompraCuotas').addEventListener('click', function() {
    document.getElementById('modalNuevaCompraCuotas').style.display = 'none';
  });
  document.getElementById('modalNuevaCompraCuotas').addEventListener('click', function(e) {
    if (e.target.id === 'modalNuevaCompraCuotas') e.target.style.display = 'none';
  });

  document.getElementById('btnGuardarCompraCuotas').addEventListener('click', function() {
    var descripcion = document.getElementById('inputDescripcionCompraCuotas').value.trim();
    if (!descripcion) { alert('Ingresa una descripcion.'); return; }
    if (!categoriaCompraCuotas) { alert('Elegi una categoria.'); return; }

    var montoTotalCompra = parsearMonto(document.getElementById('inputMontoTotalCompraCuotas').value);
    if (!montoTotalCompra || montoTotalCompra <= 0) { alert('Ingresa el monto total de la compra.'); return; }

    var cantidadCuotas = Number(document.getElementById('inputCantidadCuotasCompra').value);
    if (!cantidadCuotas || cantidadCuotas < 1) { alert('Ingresa la cantidad de cuotas.'); return; }

    var cuotaInicial = Number(document.getElementById('inputCuotaInicialCompra').value) || 1;
    if (cuotaInicial > cantidadCuotas) { alert('La cuota inicial no puede ser mayor a la cantidad de cuotas.'); return; }

    var mesPrimeraCuota = document.getElementById('inputMesPrimeraCuotaCompra').value;
    if (!mesPrimeraCuota) { alert('Elegi el mes de la primera cuota.'); return; }

    var datos = {
      descripcion: descripcion,
      categoria: categoriaCompraCuotas,
      medioPago: document.getElementById('selectMedioPagoCompraCuotas').value,
      montoTotalCompra: montoTotalCompra,
      cantidadCuotas: cantidadCuotas,
      cuotaInicial: cuotaInicial,
      mesPrimeraCuota: mesPrimeraCuota + '-01'
    };

    var btn = document.getElementById('btnGuardarCompraCuotas');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    google.script.run
      .withSuccessHandler(function() {
        btn.disabled = false;
        btn.textContent = 'Guardar compra';
        document.getElementById('modalNuevaCompraCuotas').style.display = 'none';
        cargarCuotas();
      })
      .withFailureHandler(function(error) {
        btn.disabled = false;
        btn.textContent = 'Guardar compra';
        alert('No se pudo guardar: ' + (error.message || error));
      })
      .agregarCompraCuotas(datos);
  });

  // ---------------------------------------------------------------
  // VISTA: RESUMEN GENERAL
  // ---------------------------------------------------------------
  var NOMBRES_MES_CORTO = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  document.getElementById('btnVerResumenGeneral').addEventListener('click', function() {
    document.querySelectorAll('.vista').forEach(function(v) { v.style.display = 'none'; });
    document.getElementById('vistaResumenGeneral').style.display = 'block';
    cargarResumenGeneral();
  });

  document.getElementById('btnCerrarResumenGeneral').addEventListener('click', cerrarOverlay);

  function cargarResumenGeneral() {
    document.getElementById('graficoEvolucion').innerHTML =
      '<div class="vista-cargando visible" style="padding:20px 0;width:100%;"><span class="material-symbols-rounded icon-spin">progress_activity</span></div>';
    document.getElementById('listaTopCategorias').innerHTML = '';
    google.script.run.withSuccessHandler(renderResumenGeneral).withFailureHandler(mostrarError).getResumenGeneral(6);
  }

  function renderResumenGeneral(resumen) {
    document.getElementById('montoPatrimonioResumen').textContent = formatearMonto(resumen.patrimonioTotal);

    var maximo = Math.max.apply(null, resumen.evolucion.map(function(e) { return e.totalNeto; }).concat([1]));
    var hoy = new Date();

    document.getElementById('graficoEvolucion').innerHTML = resumen.evolucion.map(function(e) {
      var alturaPorcentaje = Math.max((e.totalNeto / maximo) * 100, 2);
      var esMesActual = e.mes === hoy.getMonth() + 1 && e.anio === hoy.getFullYear();
      return '<div class="barra-mes">' +
        '<span class="barra-mes-valor">' + formatearMontoCorto(e.totalNeto) + '</span>' +
        '<div class="barra-mes-rect' + (esMesActual ? ' mes-actual' : '') + '" style="height:' + alturaPorcentaje + '%;"></div>' +
        '<span class="barra-mes-label">' + NOMBRES_MES_CORTO[e.mes - 1] + '</span>' +
        '</div>';
    }).join('');

    document.getElementById('textoPromedioMensual').textContent =
      'Promedio mensual: ' + formatearMonto(resumen.promedioMensual);

    var infoCategorias = {};
    (DATOS_APP.categorias || []).forEach(function(c) { infoCategorias[c.Nombre] = c; });

    document.getElementById('listaTopCategorias').innerHTML = resumen.topCategorias.map(function(tc) {
      return filaCategoria(tc.categoria, tc.monto, infoCategorias[tc.categoria]);
    }).join('') || '<p class="label-muted" style="text-align:center;padding:20px 0;">Sin gastos registrados este anio.</p>';
  }

  function formatearMontoCorto(numero) {
    numero = Number(numero) || 0;
    if (Math.abs(numero) >= 1000000) return '$' + Math.round(numero / 1000000 * 10) / 10 + 'M';
    if (Math.abs(numero) >= 1000) return '$' + Math.round(numero / 1000) + 'k';
    return '$' + Math.round(numero);
  }

  // ---------------------------------------------------------------
  // VISTA: CUENTAS
  // ---------------------------------------------------------------
  var cuentaEnEdicionId = null;

  document.getElementById('btnVerCuentas').addEventListener('click', function() {
    document.querySelectorAll('.vista').forEach(function(v) { v.style.display = 'none'; });
    document.getElementById('vistaCuentas').style.display = 'block';
    cargarCuentasTab();
  });

  document.getElementById('btnCerrarCuentas').addEventListener('click', cerrarOverlay);

  function cargarCuentasTab() {
    document.getElementById('listaCuentasTab').innerHTML =
      '<div class="vista-cargando visible" style="padding:30px 0;"><span class="material-symbols-rounded icon-spin">progress_activity</span></div>';
    google.script.run.withSuccessHandler(renderCuentasTab).withFailureHandler(mostrarError).getCuentas(false);
  }

  function renderCuentasTab(lista) {
    var patrimonio = lista
      .filter(function(c) { return c.Activa !== false; })
      .reduce(function(s, c) { return s + (Number(c.SaldoActual) || 0); }, 0);
    document.getElementById('montoPatrimonioTotal').textContent = formatearMonto(patrimonio);

    // refrescamos el cache local, asi los selectores de cuenta en otros
    // formularios reflejan altas/bajas sin recargar toda la app
    DATOS_APP.cuentas = lista.filter(function(c) { return c.Activa !== false; });

    if (!lista.length) {
      document.getElementById('listaCuentasTab').innerHTML =
        '<p class="label-muted" style="text-align:center;padding:20px 0;">Todavia no cargaste ninguna cuenta.</p>';
      return;
    }

    document.getElementById('listaCuentasTab').innerHTML = lista.map(function(c) {
      return '<div class="fila-categoria-admin' + (c.Activa === false ? ' inactiva' : '') + '" data-id="' + c.ID + '">' +
        '<div class="icono-categoria icono-cuenta" style="background:' + c.Color + '22;">' +
          '<span class="material-symbols-rounded" style="color:' + c.Color + ';">' + c.Icono + '</span>' +
        '</div>' +
        '<div class="nombre-cat">' +
          '<p class="nombre">' + escaparHtml(c.Nombre) + '</p>' +
          '<p class="subnombre">' + formatearMonto(c.SaldoActual) + '</p>' +
        '</div>' +
        '<button type="button" class="btn-editar-cat" data-id="' + c.ID + '" aria-label="Editar">' +
          '<span class="material-symbols-rounded icon-sm">edit</span>' +
        '</button>' +
        '<input type="checkbox" class="switch-activo" data-id="' + c.ID + '" ' + (c.Activa !== false ? 'checked' : '') + '>' +
        '</div>';
    }).join('');

    document.querySelectorAll('#listaCuentasTab .switch-activo').forEach(function(sw) {
      sw.addEventListener('change', function() {
        var id = sw.getAttribute('data-id');
        var fn = sw.checked ? 'reactivarCuenta' : 'desactivarCuenta';
        google.script.run
          .withSuccessHandler(function() {
            sw.closest('.fila-categoria-admin').classList.toggle('inactiva', !sw.checked);
            cargarCuentasTab();
          })
          .withFailureHandler(function(error) {
            sw.checked = !sw.checked;
            alert('No se pudo actualizar: ' + (error.message || error));
          })[fn](id);
      });
    });

    document.querySelectorAll('#listaCuentasTab .btn-editar-cat').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cuenta = lista.find(function(c) { return c.ID === btn.getAttribute('data-id'); });
        if (cuenta) abrirModalEditarCuenta(cuenta);
      });
    });
  }

  var ICONOS_CUENTA_SUGERIDOS = [
    'account_balance', 'account_balance_wallet', 'credit_card', 'payments',
    'savings', 'currency_exchange', 'qr_code_2', 'local_atm',
    'monetization_on', 'wallet', 'phone_iphone', 'corporate_fare',
    'account_box', 'diamond', 'paid', 'euro_symbol'
  ];

  function renderGrillaIconosCuenta(seleccionado) {
    document.getElementById('grillaIconosCuenta').innerHTML = ICONOS_CUENTA_SUGERIDOS.map(function(icono) {
      return '<button type="button" class="' + (icono === seleccionado ? 'seleccionado' : '') + '" data-icono="' + icono + '">' +
        '<span class="material-symbols-rounded">' + icono + '</span>' +
        '</button>';
    }).join('');

    document.querySelectorAll('#grillaIconosCuenta button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var icono = btn.getAttribute('data-icono');
        document.getElementById('inputIconoCuenta').value = icono;
        document.getElementById('previewIconoCuenta').textContent = icono;
        document.querySelectorAll('#grillaIconosCuenta button').forEach(function(b) { b.classList.remove('seleccionado'); });
        btn.classList.add('seleccionado');
      });
    });
  }

  document.getElementById('btnNuevaCuenta').addEventListener('click', function() {
    abrirModalEditarCuenta(null);
  });

  function abrirModalEditarCuenta(cuenta) {
    cuentaEnEdicionId = cuenta ? cuenta.ID : null;
    document.getElementById('tituloModalEditarCuenta').textContent = cuenta ? 'Editar cuenta' : 'Nueva cuenta';
    document.getElementById('inputNombreCuenta').value = cuenta ? cuenta.Nombre : '';
    document.getElementById('inputIconoCuenta').value = cuenta ? cuenta.Icono : 'account_balance';
    document.getElementById('previewIconoCuenta').textContent = cuenta ? cuenta.Icono : 'account_balance';
    document.getElementById('inputColorCuenta').value = cuenta ? (cuenta.Color || '#378ADD') : '#378ADD';
    document.getElementById('labelSaldoCuenta').textContent = cuenta ? 'Saldo inicial (ajusta el punto de partida)' : 'Saldo inicial';
    document.getElementById('inputSaldoCuenta').value = cuenta ? cuenta.SaldoInicial : '0';
    renderGrillaIconosCuenta(cuenta ? cuenta.Icono : 'account_balance');
    document.getElementById('modalEditarCuenta').style.display = 'flex';
  }

  document.getElementById('inputIconoCuenta').addEventListener('input', function(e) {
    var valor = e.target.value.trim() || 'account_balance';
    document.getElementById('previewIconoCuenta').textContent = valor;
    document.querySelectorAll('#grillaIconosCuenta button').forEach(function(b) {
      b.classList.toggle('seleccionado', b.getAttribute('data-icono') === valor);
    });
  });

  document.getElementById('btnCerrarModalEditarCuenta').addEventListener('click', function() {
    document.getElementById('modalEditarCuenta').style.display = 'none';
  });
  document.getElementById('modalEditarCuenta').addEventListener('click', function(e) {
    if (e.target.id === 'modalEditarCuenta') e.target.style.display = 'none';
  });

  document.getElementById('btnGuardarCuenta').addEventListener('click', function() {
    var nombre = document.getElementById('inputNombreCuenta').value.trim();
    if (!nombre) { alert('Ingresa un nombre.'); return; }

    var datos = {
      nombre: nombre,
      icono: document.getElementById('inputIconoCuenta').value.trim() || 'account_balance',
      color: document.getElementById('inputColorCuenta').value,
      saldoInicial: parsearMonto(document.getElementById('inputSaldoCuenta').value)
    };

    var btn = document.getElementById('btnGuardarCuenta');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    var terminar = function() {
      btn.disabled = false;
      btn.textContent = 'Guardar cuenta';
      document.getElementById('modalEditarCuenta').style.display = 'none';
      cargarCuentasTab();
    };

    var manejarError = function(error) {
      btn.disabled = false;
      btn.textContent = 'Guardar cuenta';
      alert('No se pudo guardar: ' + (error.message || error));
    };

    if (cuentaEnEdicionId) {
      google.script.run.withSuccessHandler(terminar).withFailureHandler(manejarError)
        .editarCuenta(cuentaEnEdicionId, datos);
    } else {
      google.script.run.withSuccessHandler(terminar).withFailureHandler(manejarError)
        .agregarCuenta(datos);
    }
  });

  // ---------------------------------------------------------------
  // VISTA: CATEGORIAS
  // ---------------------------------------------------------------
  var categoriaEnEdicionId = null;
  var ORDEN_TIPOS = ['Fijo', 'Variable', 'Ahorro', 'Ingreso'];

  function cargarCategoriasTab() {
    document.getElementById('listaCategoriasTab').innerHTML =
      '<div class="vista-cargando visible" style="padding:30px 0;"><span class="material-symbols-rounded icon-spin">progress_activity</span></div>';
    google.script.run.withSuccessHandler(renderCategoriasTab).withFailureHandler(mostrarError).getCategorias(false);
  }

  function renderCategoriasTab(lista) {
    var html = '';
    ORDEN_TIPOS.forEach(function(tipo) {
      var delTipo = lista.filter(function(c) { return c.Tipo === tipo; });
      if (!delTipo.length) return;

      html += '<p class="titulo-grupo-tipo">' + tipo + '</p>';
      html += delTipo.map(function(c) {
        var color = COLORES_CATEGORIA[c.Nombre] || c.Color || '#5F5E5A';
        var subnombre = c.Subcategoria ? '<p class="subnombre">' + escaparHtml(c.Subcategoria) + '</p>' : '';
        return '<div class="fila-categoria-admin' + (c.Activa ? '' : ' inactiva') + '" data-id="' + c.ID + '">' +
          '<div class="icono-categoria" style="background:' + color + '22;">' +
            '<span class="material-symbols-rounded" style="color:' + color + ';">' + c.Icono + '</span>' +
          '</div>' +
          '<div class="nombre-cat">' +
            '<p class="nombre">' + escaparHtml(c.Nombre) + '</p>' +
            subnombre +
          '</div>' +
          '<button type="button" class="btn-editar-cat" data-id="' + c.ID + '" aria-label="Editar">' +
            '<span class="material-symbols-rounded icon-sm">edit</span>' +
          '</button>' +
          '<input type="checkbox" class="switch-activo" data-id="' + c.ID + '" ' + (c.Activa ? 'checked' : '') + '>' +
          '</div>';
      }).join('');
    });

    document.getElementById('listaCategoriasTab').innerHTML = html ||
      '<p class="label-muted" style="text-align:center;padding:30px 0;">Todavia no hay categorias.</p>';

    document.querySelectorAll('.switch-activo').forEach(function(sw) {
      sw.addEventListener('change', function() {
        var id = sw.getAttribute('data-id');
        var fn = sw.checked ? 'reactivarCategoria' : 'desactivarCategoria';
        google.script.run
          .withSuccessHandler(function() {
            sw.closest('.fila-categoria-admin').classList.toggle('inactiva', !sw.checked);
            refrescarCacheCategorias();
          })
          .withFailureHandler(function(error) {
            sw.checked = !sw.checked;
            alert('No se pudo actualizar: ' + (error.message || error));
          })[fn](id);
      });
    });

    document.querySelectorAll('.btn-editar-cat').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cat = lista.find(function(c) { return c.ID === btn.getAttribute('data-id'); });
        if (cat) abrirModalEditarCategoria(cat);
      });
    });
  }

  function refrescarCacheCategorias() {
    google.script.run.withSuccessHandler(function(categorias) {
      DATOS_APP.categorias = categorias;
    }).withFailureHandler(function() {}).getCategorias(true);
  }

  document.getElementById('btnNuevaCategoria').addEventListener('click', function() {
    abrirModalEditarCategoria(null);
  });

  var ICONOS_SUGERIDOS = [
    'restaurant', 'shopping_basket', 'local_cafe', 'sports_bar', 'delivery_dining',
    'cleaning_services', 'soap', 'checkroom', 'footprint', 'local_gas_station',
    'toll', 'local_parking', 'directions_bus', 'directions_car', 'movie',
    'celebration', 'medication', 'stethoscope', 'pets', 'hardware',
    'chair', 'home', 'apartment', 'bolt', 'water_drop', 'wifi', 'smartphone',
    'security', 'play_circle', 'fitness_center', 'school', 'menu_book',
    'credit_score', 'savings', 'attach_money', 'trending_up', 'currency_bitcoin',
    'payments', 'work', 'laptop_mac', 'add_circle', 'groups', 'category'
  ];

  function renderGrillaIconos(seleccionado) {
    document.getElementById('grillaIconos').innerHTML = ICONOS_SUGERIDOS.map(function(icono) {
      return '<button type="button" class="' + (icono === seleccionado ? 'seleccionado' : '') + '" data-icono="' + icono + '">' +
        '<span class="material-symbols-rounded">' + icono + '</span>' +
        '</button>';
    }).join('');

    document.querySelectorAll('#grillaIconos button').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var icono = btn.getAttribute('data-icono');
        document.getElementById('inputIconoCategoria').value = icono;
        document.getElementById('previewIconoCategoria').textContent = icono;
        document.querySelectorAll('#grillaIconos button').forEach(function(b) { b.classList.remove('seleccionado'); });
        btn.classList.add('seleccionado');
      });
    });
  }

  function abrirModalEditarCategoria(cat) {
    categoriaEnEdicionId = cat ? cat.ID : null;
    document.getElementById('tituloModalEditarCategoria').textContent = cat ? 'Editar categoria' : 'Nueva categoria';
    document.getElementById('inputNombreCategoria').value = cat ? cat.Nombre : '';
    document.getElementById('inputSubcategoriaCategoria').value = cat ? cat.Subcategoria : '';
    document.getElementById('inputIconoCategoria').value = cat ? cat.Icono : 'category';
    document.getElementById('previewIconoCategoria').textContent = cat ? cat.Icono : 'category';
    document.getElementById('inputColorCategoria').value = cat ? (cat.Color || '#9E9E9E') : '#378ADD';
    renderGrillaIconos(cat ? cat.Icono : 'category');

    var tipoActual = cat ? cat.Tipo : 'Variable';
    document.querySelectorAll('#chipsTipoCategoria .chip-tipo').forEach(function(c) {
      c.classList.toggle('activo', c.getAttribute('data-tipo') === tipoActual);
    });

    document.getElementById('modalEditarCategoria').style.display = 'flex';
  }

  document.querySelectorAll('#chipsTipoCategoria .chip-tipo').forEach(function(chip) {
    chip.addEventListener('click', function() {
      document.querySelectorAll('#chipsTipoCategoria .chip-tipo').forEach(function(c) { c.classList.remove('activo'); });
      chip.classList.add('activo');
    });
  });

  document.getElementById('inputIconoCategoria').addEventListener('input', function(e) {
    var valor = e.target.value.trim() || 'category';
    document.getElementById('previewIconoCategoria').textContent = valor;
    document.querySelectorAll('#grillaIconos button').forEach(function(b) {
      b.classList.toggle('seleccionado', b.getAttribute('data-icono') === valor);
    });
  });

  document.getElementById('btnCerrarModalEditarCategoria').addEventListener('click', function() {
    document.getElementById('modalEditarCategoria').style.display = 'none';
  });
  document.getElementById('modalEditarCategoria').addEventListener('click', function(e) {
    if (e.target.id === 'modalEditarCategoria') e.target.style.display = 'none';
  });

  document.getElementById('btnGuardarCategoria').addEventListener('click', function() {
    var nombre = document.getElementById('inputNombreCategoria').value.trim();
    if (!nombre) { alert('Ingresa un nombre.'); return; }

    var chipActivo = document.querySelector('#chipsTipoCategoria .chip-tipo.activo');
    var tipo = chipActivo ? chipActivo.getAttribute('data-tipo') : 'Variable';

    var datos = {
      nombre: nombre,
      tipo: tipo,
      subcategoria: document.getElementById('inputSubcategoriaCategoria').value.trim(),
      icono: document.getElementById('inputIconoCategoria').value.trim() || 'category',
      color: document.getElementById('inputColorCategoria').value
    };

    var btn = document.getElementById('btnGuardarCategoria');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    var terminar = function() {
      btn.disabled = false;
      btn.textContent = 'Guardar categoria';
      document.getElementById('modalEditarCategoria').style.display = 'none';
      cargarCategoriasTab();
      refrescarCacheCategorias();
    };

    var manejarError = function(error) {
      btn.disabled = false;
      btn.textContent = 'Guardar categoria';
      alert('No se pudo guardar: ' + (error.message || error));
    };

    if (categoriaEnEdicionId) {
      google.script.run.withSuccessHandler(terminar).withFailureHandler(manejarError)
        .editarCategoria(categoriaEnEdicionId, datos);
    } else {
      google.script.run.withSuccessHandler(terminar).withFailureHandler(manejarError)
        .agregarCategoria(datos);
    }
  });
  // ---------------------------------------------------------------
  // NUEVO GASTO DENTRO DE UN GRUPO
  // ---------------------------------------------------------------
  document.getElementById('btnCerrarModalPersona').addEventListener('click', function() {
    document.getElementById('modalNuevaPersona').style.display = 'none';
  });
  document.getElementById('modalNuevaPersona').addEventListener('click', function(e) {
    if (e.target.id === 'modalNuevaPersona') e.target.style.display = 'none';
  });

  document.getElementById('btnGuardarPersona').addEventListener('click', function() {
    var nombre = document.getElementById('inputNombrePersona').value.trim();
    if (!nombre) { alert('Ingresa un nombre.'); return; }

    google.script.run
      .withSuccessHandler(function(resultado) {
        document.getElementById('modalNuevaPersona').style.display = 'none';
        google.script.run
          .withSuccessHandler(function(personas) {
            DATOS_APP.personas = personas;
            var nueva = personas.find(function(p) { return p.ID === resultado.id; });
            var estado = _estadoParticipantesActual();
            if (nueva && estado && estado.disponibles) {
              // la agregamos a la lista disponible, ya tildada, y
              // refrescamos el buscador para que se vea de una
              estado.disponibles.push({ id: nueva.ID, nombre: nueva.Nombre, seleccionado: true });
              if (contextoParticipantes === 'gasto') {
                var opcion = document.createElement('option');
                opcion.value = nueva.ID;
                opcion.textContent = nueva.Nombre;
                document.getElementById('selectPagadoPor').appendChild(opcion);
              }
              renderListaBuscarParticipantes(document.getElementById('inputBuscarParticipante').value);
            }
          })
          .withFailureHandler(mostrarError)
          .getPersonas(true);
      })
      .withFailureHandler(function(error) {
        alert('No se pudo agregar la persona: ' + (error.message || error));
      })
      .agregarPersona(nombre);
  });

  document.getElementById('btnNuevoGastoGrupo').addEventListener('click', abrirModalNuevoGastoGrupo);

  function abrirModalNuevoGastoGrupo() {
    document.getElementById('inputDescripcionGastoGrupo').value = '';
    document.getElementById('inputMontoGastoGrupo').value = '';
    document.getElementById('inputFechaGastoGrupo').value = new Date().toISOString().slice(0, 10);
    document.getElementById('textoCategoriaGastoGrupo').textContent = 'Elegir categoria';
    document.getElementById('iconoCategoriaGastoGrupo').textContent = 'category';
    document.getElementById('textoCuentaGastoGrupoSel').textContent = 'Elegir cuenta';
    document.getElementById('iconoCuentaGastoGrupoSel').textContent = 'account_balance';
    document.getElementById('textoParticipantesSel').textContent = 'Elegir participantes';
    estadoNuevoGasto = { categoria: null, subcategoria: null, cuentaId: null };

    var opciones = [{ ID: 'YO', Nombre: 'Yo' }].concat(DATOS_APP.personas || []);
    document.getElementById('selectPagadoPor').innerHTML = opciones.map(function(p) {
      return '<option value="' + p.ID + '">' + escaparHtml(p.Nombre) + '</option>';
    }).join('');
    actualizarFilaCategoriaGastoGrupo();

    // Todos empiezan destildados: el usuario elige a quien corresponde
    // este gasto puntual, ya que no siempre participan todos.
    estadoNuevoGasto.disponibles = opciones.map(function(p) {
      return { id: p.ID, nombre: p.Nombre, seleccionado: false };
    });
    estadoNuevoGasto.participantes = [];
    renderParticipantesGastoGrupo();

    document.getElementById('modalNuevoGastoGrupo').style.display = 'flex';
  }

  document.getElementById('selectPagadoPor').addEventListener('change', actualizarFilaCategoriaGastoGrupo);

  function actualizarFilaCategoriaGastoGrupo() {
    var esYo = document.getElementById('selectPagadoPor').value === 'YO';
    document.getElementById('filaCategoriaGastoGrupo').style.display = esYo ? 'block' : 'none';
  }

  document.getElementById('btnCategoriaGastoGrupo').addEventListener('click', function() {
    abrirModalCategoria('Variable', function(nombre, icono) {
      estadoNuevoGasto.categoria = nombre;
      document.getElementById('textoCategoriaGastoGrupo').textContent = nombre;
      document.getElementById('iconoCategoriaGastoGrupo').textContent = icono;
    });
  });

  document.getElementById('btnCuentaGastoGrupo').addEventListener('click', function() {
    abrirModalCuenta(function(id, nombre, icono) {
      estadoNuevoGasto.cuentaId = id;
      document.getElementById('textoCuentaGastoGrupoSel').textContent = nombre;
      document.getElementById('iconoCuentaGastoGrupoSel').textContent = icono;
    });
  });

  // ---------------------------------------------------------------
  // SELECTOR DE PARTICIPANTES (buscador, todos destildados por defecto)
  // Generico: sirve tanto para "Nuevo gasto grupal" como para
  // "Ticket -> Grupo", segun contextoParticipantes.
  // ---------------------------------------------------------------
  var contextoParticipantes = 'gasto'; // 'gasto' | 'ticket'
  var estadoParticipantesTicket = { disponibles: [], participantes: [] };

  function _estadoParticipantesActual() {
    return contextoParticipantes === 'ticket' ? estadoParticipantesTicket : estadoNuevoGasto;
  }

  document.getElementById('btnElegirParticipantes').addEventListener('click', function() {
    contextoParticipantes = 'gasto';
    document.getElementById('inputBuscarParticipante').value = '';
    renderListaBuscarParticipantes('');
    document.getElementById('modalParticipantes').style.display = 'flex';
  });

  function renderListaBuscarParticipantes(filtro) {
    var filtroNorm = (filtro || '').trim().toLowerCase();
    var estado = _estadoParticipantesActual();
    var lista = estado.disponibles.filter(function(p) {
      return p.nombre.toLowerCase().indexOf(filtroNorm) !== -1;
    });

    document.getElementById('listaBuscarParticipantes').innerHTML = lista.map(function(p) {
      return '<div class="fila-buscar-participante" data-id="' + p.id + '">' +
        '<input type="checkbox" data-id="' + p.id + '" ' + (p.seleccionado ? 'checked' : '') + '>' +
        '<span class="nombre-participante">' + escaparHtml(p.nombre) + '</span>' +
        '</div>';
    }).join('') || '<p class="label-muted" style="padding:10px 0;">Sin resultados.</p>';

    document.querySelectorAll('.fila-buscar-participante').forEach(function(fila) {
      fila.addEventListener('click', function(e) {
        var id = fila.getAttribute('data-id');
        var persona = estado.disponibles.find(function(p) { return p.id === id; });
        if (e.target.tagName !== 'INPUT') persona.seleccionado = !persona.seleccionado;
        fila.querySelector('input[type="checkbox"]').checked = persona.seleccionado;
      });
    });
  }

  document.getElementById('inputBuscarParticipante').addEventListener('input', function(e) {
    renderListaBuscarParticipantes(e.target.value);
  });

  document.getElementById('btnCerrarModalParticipantes').addEventListener('click', function() {
    document.getElementById('modalParticipantes').style.display = 'none';
  });
  document.getElementById('modalParticipantes').addEventListener('click', function(e) {
    if (e.target.id === 'modalParticipantes') e.target.style.display = 'none';
  });

  document.getElementById('btnConfirmarParticipantes').addEventListener('click', function() {
    var estado = _estadoParticipantesActual();
    var seleccionados = estado.disponibles.filter(function(p) { return p.seleccionado; });

    // conservamos el monto ya editado de quienes seguian seleccionados
    var montosPrevios = {};
    estado.participantes.forEach(function(p) { montosPrevios[p.id] = p.monto; });

    estado.participantes = seleccionados.map(function(p) {
      return { id: p.id, nombre: p.nombre, monto: montosPrevios[p.id] || 0 };
    });

    if (contextoParticipantes === 'ticket') {
      recalcularSplitTicket();
      renderParticipantesTicket();
      document.getElementById('textoParticipantesTicketSel').textContent = seleccionados.length
        ? seleccionados.length + ' seleccionado(s)'
        : 'Elegir participantes';
    } else {
      recalcularSplitIgualitario();
      renderParticipantesGastoGrupo();
      document.getElementById('textoParticipantesSel').textContent = seleccionados.length
        ? seleccionados.length + ' seleccionado(s)'
        : 'Elegir participantes';
    }

    document.getElementById('modalParticipantes').style.display = 'none';
  });

  document.getElementById('btnAgregarPersonaDesdeBuscador').addEventListener('click', function() {
    document.getElementById('inputNombrePersona').value = '';
    document.getElementById('modalNuevaPersona').style.display = 'flex';
  });

  // ---------------------------------------------------------------
  // TICKET -> GRUPO (destino Mio/Grupo dentro de la confirmacion)
  // ---------------------------------------------------------------
  document.querySelectorAll('#chipsDestinoTicket .chip-tipo').forEach(function(chip) {
    chip.addEventListener('click', function() {
      document.querySelectorAll('#chipsDestinoTicket .chip-tipo').forEach(function(c) { c.classList.remove('activo'); });
      chip.classList.add('activo');
      estadoTicket.destino = chip.getAttribute('data-destino');
      document.getElementById('filaGrupoTicket').style.display = estadoTicket.destino === 'grupo' ? 'block' : 'none';

      if (estadoTicket.destino === 'grupo') {
        google.script.run.withSuccessHandler(function(grupos) {
          document.getElementById('selectGrupoTicket').innerHTML = grupos.map(function(g) {
            return '<option value="' + g.ID + '">' + escaparHtml(g.Nombre) + '</option>';
          }).join('') || '<option value="">Sin grupos creados</option>';
        }).withFailureHandler(mostrarError).getGrupos(true);

        var opciones = [{ ID: 'YO', Nombre: 'Yo' }].concat(DATOS_APP.personas || []);
        estadoParticipantesTicket.disponibles = opciones.map(function(p) {
          return { id: p.ID, nombre: p.Nombre, seleccionado: false };
        });
        estadoParticipantesTicket.participantes = [];
        document.getElementById('textoParticipantesTicketSel').textContent = 'Elegir participantes';
        renderParticipantesTicket();
      }
    });
  });

  document.getElementById('btnElegirParticipantesTicket').addEventListener('click', function() {
    contextoParticipantes = 'ticket';
    document.getElementById('inputBuscarParticipante').value = '';
    renderListaBuscarParticipantes('');
    document.getElementById('modalParticipantes').style.display = 'flex';
  });

  function recalcularSplitTicket() {
    var total = (estadoTicket.items || []).reduce(function(s, i) { return s + (Number(i.monto) || 0); }, 0);
    if (!estadoParticipantesTicket.participantes.length) return;
    var partes = Math.round((total / estadoParticipantesTicket.participantes.length) * 100) / 100;
    estadoParticipantesTicket.participantes.forEach(function(p) { p.monto = partes; });
  }

  function renderParticipantesTicket() {
    var total = (estadoTicket.items || []).reduce(function(s, i) { return s + (Number(i.monto) || 0); }, 0);

    if (!estadoParticipantesTicket.participantes.length) {
      document.getElementById('listaParticipantesTicket').innerHTML =
        '<p class="label-muted" style="padding:6px 0;">Todavia no elegiste participantes.</p>';
      document.getElementById('totalAsignadoTicket').textContent = '';
      return;
    }

    document.getElementById('listaParticipantesTicket').innerHTML = estadoParticipantesTicket.participantes.map(function(p, i) {
      return '<div class="fila-participante-monto">' +
        '<span class="nombre-participante">' + escaparHtml(p.nombre) + '</span>' +
        '<input type="text" inputmode="decimal" class="input-monto-participante" data-index="' + i + '" value="' + p.monto + '">' +
        '</div>';
    }).join('');

    document.querySelectorAll('#listaParticipantesTicket .input-monto-participante').forEach(function(inp) {
      inp.addEventListener('input', function() {
        var i = Number(inp.getAttribute('data-index'));
        estadoParticipantesTicket.participantes[i].monto = parsearMonto(inp.value);
        actualizarTotalAsignadoTicket();
      });
    });

    actualizarTotalAsignadoTicket();
  }

  function actualizarTotalAsignadoTicket() {
    var total = (estadoTicket.items || []).reduce(function(s, i) { return s + (Number(i.monto) || 0); }, 0);
    var totalAsignado = estadoParticipantesTicket.participantes.reduce(function(s, p) { return s + (Number(p.monto) || 0); }, 0);
    document.getElementById('totalAsignadoTicket').textContent =
      'Asignado ' + formatearMonto(totalAsignado) + ' de ' + formatearMonto(total);
  }

  function recalcularSplitIgualitario() {
    var monto = parsearMonto(document.getElementById('inputMontoGastoGrupo').value);
    if (!estadoNuevoGasto.participantes.length) return;
    var partes = Math.round((monto / estadoNuevoGasto.participantes.length) * 100) / 100;
    estadoNuevoGasto.participantes.forEach(function(p) { p.monto = partes; });
  }

  function renderParticipantesGastoGrupo() {
    if (!estadoNuevoGasto.participantes.length) {
      document.getElementById('listaParticipantesGastoGrupo').innerHTML =
        '<p class="label-muted" style="padding:6px 0;">Todavia no elegiste participantes.</p>';
      actualizarTotalAsignadoGastoGrupo();
      return;
    }

    document.getElementById('listaParticipantesGastoGrupo').innerHTML = estadoNuevoGasto.participantes.map(function(p, i) {
      return '<div class="fila-participante-monto">' +
        '<span class="nombre-participante">' + escaparHtml(p.nombre) + '</span>' +
        '<input type="text" inputmode="decimal" class="input-monto-participante" data-index="' + i + '" value="' + p.monto + '">' +
        '</div>';
    }).join('');

    document.querySelectorAll('#listaParticipantesGastoGrupo .input-monto-participante').forEach(function(inp) {
      inp.addEventListener('input', function() {
        var i = Number(inp.getAttribute('data-index'));
        estadoNuevoGasto.participantes[i].monto = parsearMonto(inp.value);
        actualizarTotalAsignadoGastoGrupo();
      });
    });

    actualizarTotalAsignadoGastoGrupo();
  }

  function actualizarTotalAsignadoGastoGrupo() {
    var totalAsignado = estadoNuevoGasto.participantes.reduce(function(s, p) { return s + (Number(p.monto) || 0); }, 0);
    var totalGasto = parsearMonto(document.getElementById('inputMontoGastoGrupo').value);
    document.getElementById('totalAsignadoGastoGrupo').textContent =
      'Asignado ' + formatearMonto(totalAsignado) + ' de ' + formatearMonto(totalGasto);
  }

  document.getElementById('inputMontoGastoGrupo').addEventListener('input', function() {
    recalcularSplitIgualitario();
    renderParticipantesGastoGrupo();
  });

  document.getElementById('btnCerrarModalGastoGrupo').addEventListener('click', function() {
    document.getElementById('modalNuevoGastoGrupo').style.display = 'none';
  });
  document.getElementById('modalNuevoGastoGrupo').addEventListener('click', function(e) {
    if (e.target.id === 'modalNuevoGastoGrupo') e.target.style.display = 'none';
  });

  document.getElementById('btnGuardarGastoGrupo').addEventListener('click', function() {
    var monto = parsearMonto(document.getElementById('inputMontoGastoGrupo').value);
    if (!monto || monto <= 0) { alert('Ingresa un monto valido.'); return; }

    var pagadoPor = document.getElementById('selectPagadoPor').value;
    if (pagadoPor === 'YO' && !estadoNuevoGasto.categoria) { alert('Elegi una categoria.'); return; }
    if (pagadoPor === 'YO' && !estadoNuevoGasto.cuentaId) { alert('Elegi una cuenta.'); return; }

    if (!estadoNuevoGasto.participantes.length) { alert('Elegi al menos un participante.'); return; }

    var totalAsignado = estadoNuevoGasto.participantes.reduce(function(s, p) { return s + (Number(p.monto) || 0); }, 0);
    if (Math.abs(totalAsignado - monto) > 1) {
      alert('Los montos asignados (' + formatearMonto(totalAsignado) + ') no coinciden con el total (' + formatearMonto(monto) + ').');
      return;
    }

    var datos = {
      grupoId: grupoActualId,
      descripcion: document.getElementById('inputDescripcionGastoGrupo').value || estadoNuevoGasto.categoria || 'Gasto',
      monto: monto,
      pagadoPor: pagadoPor,
      categoria: estadoNuevoGasto.categoria || '',
      subcategoria: estadoNuevoGasto.subcategoria || '',
      cuentaId: estadoNuevoGasto.cuentaId || '',
      fecha: document.getElementById('inputFechaGastoGrupo').value,
      participantes: estadoNuevoGasto.participantes.map(function(p) { return { personaId: p.id, monto: p.monto }; })
    };

    var btn = document.getElementById('btnGuardarGastoGrupo');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    google.script.run
      .withSuccessHandler(function() {
        btn.disabled = false;
        btn.textContent = 'Guardar gasto';
        document.getElementById('modalNuevoGastoGrupo').style.display = 'none';
        cargarDetalleGrupo();
        cargarDashboard();
      })
      .withFailureHandler(function(error) {
        btn.disabled = false;
        btn.textContent = 'Guardar gasto';
        alert('No se pudo guardar el gasto: ' + (error.message || error));
      })
      .agregarGastoGrupo(datos);
  });

  // ---------------------------------------------------------------
  // LIQUIDACION (marcar como pagado)
  // ---------------------------------------------------------------
  function abrirModalLiquidacion(transaccion) {
    liquidacionActual = transaccion;
    liquidacionActual.categoriaElegida = null;
    liquidacionActual.cuentaId = null;
    document.getElementById('tituloModalLiquidacion').textContent = transaccion.deNombre + ' \u2192 ' + transaccion.aNombre;
    document.getElementById('inputMontoLiquidacion').value = transaccion.monto;
    document.getElementById('inputFechaLiquidacion').value = new Date().toISOString().slice(0, 10);
    document.getElementById('textoCategoriaLiquidacion').textContent = 'Elegir categoria';
    document.getElementById('iconoCategoriaLiquidacion').textContent = 'category';
    document.getElementById('textoCuentaLiquidacionSel').textContent = 'Elegir cuenta';
    document.getElementById('iconoCuentaLiquidacionSel').textContent = 'account_balance';
    document.getElementById('filaCategoriaLiquidacion').style.display = transaccion.dePersonaId === 'YO' ? 'block' : 'none';
    document.getElementById('modalLiquidacion').style.display = 'flex';
  }

  document.getElementById('btnCategoriaLiquidacion').addEventListener('click', function() {
    abrirModalCategoria('Variable', function(nombre, icono) {
      liquidacionActual.categoriaElegida = nombre;
      document.getElementById('textoCategoriaLiquidacion').textContent = nombre;
      document.getElementById('iconoCategoriaLiquidacion').textContent = icono;
    });
  });

  document.getElementById('btnCuentaLiquidacion').addEventListener('click', function() {
    abrirModalCuenta(function(id, nombre, icono) {
      liquidacionActual.cuentaId = id;
      document.getElementById('textoCuentaLiquidacionSel').textContent = nombre;
      document.getElementById('iconoCuentaLiquidacionSel').textContent = icono;
    });
  });

  document.getElementById('btnCerrarModalLiquidacion').addEventListener('click', function() {
    document.getElementById('modalLiquidacion').style.display = 'none';
  });
  document.getElementById('modalLiquidacion').addEventListener('click', function(e) {
    if (e.target.id === 'modalLiquidacion') e.target.style.display = 'none';
  });

  document.getElementById('btnConfirmarLiquidacion').addEventListener('click', function() {
    var monto = parsearMonto(document.getElementById('inputMontoLiquidacion').value);
    if (!monto || monto <= 0) { alert('Ingresa un monto valido.'); return; }
    if (liquidacionActual.dePersonaId === 'YO' && !liquidacionActual.categoriaElegida) {
      alert('Elegi una categoria.');
      return;
    }
    if (!liquidacionActual.cuentaId) { alert('Elegi una cuenta.'); return; }

    var datos = {
      grupoId: grupoActualId,
      dePersonaId: liquidacionActual.dePersonaId,
      aPersonaId: liquidacionActual.aPersonaId,
      monto: monto,
      fecha: document.getElementById('inputFechaLiquidacion').value,
      categoria: liquidacionActual.categoriaElegida || '',
      cuentaId: liquidacionActual.cuentaId
    };

    google.script.run
      .withSuccessHandler(function() {
        document.getElementById('modalLiquidacion').style.display = 'none';
        cargarDetalleGrupo();
        cargarDashboard();
      })
      .withFailureHandler(function(error) {
        alert('No se pudo registrar el pago: ' + (error.message || error));
      })
      .registrarLiquidacion(datos);
  });

  inicializarTema();
  cargarDashboard();
