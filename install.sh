#!/usr/bin/env bash
# =============================================================================
# install.sh — Instalador de Gremio 2 (equipo de devs para OpenCode)
#
# Instala el ecosistema en el repo destino:
#   - .opencode/         agentes y skills (se actualizan siempre)
#   - board/             tablero (solo crea lo que falta; no pisa tu trabajo)
#   - AGENTS.md          inyecta el bloque Gremio 2 entre marcadores (idempotente)
#   - opencode.json      mergea MCPs, permisos y default_agent sin pisar nada
#
# Uso:
#   ./install.sh                    # instala en el directorio actual
#   ./install.sh --target <dir>     # instala en <dir>
#   ./install.sh --dry-run          # muestra qué haría, sin copiar
#   ./install.sh --setup            # instala el comando global `gremio2` (una vez)
#   ./install.sh --keep-package     # no borra el paquete al terminar
#
# Es idempotente: ejecutarlo dos veces no rompe nada.
# =============================================================================
set -euo pipefail

SOURCE="${BASH_SOURCE[0]}"
while [ -L "$SOURCE" ]; do
  DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
  SOURCE="$(readlink "$SOURCE")"
  case "$SOURCE" in /*) ;; *) SOURCE="$DIR/$SOURCE" ;; esac
done
SCRIPT_DIR="$(cd -P "$(dirname "$SOURCE")" && pwd)"
TARGET="$PWD"
DRY_RUN=0
KEEP_PACKAGE=0
SETUP=0
START_MARK="<!-- GREMIO2-START -->"
END_MARK="<!-- GREMIO2-END -->"

while [ $# -gt 0 ]; do
  case "$1" in
    --target) TARGET="${2:-}"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --keep-package) KEEP_PACKAGE=1; shift ;;
    --setup) SETUP=1; shift ;;
    -h|--help)
      awk 'NR==1{next} /^# =+$/{c++; if(c==2) exit; next} c==1 {sub(/^# ?/,""); print}' "$0"
      exit 0 ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
done

run()  { if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] $*"; else "$@"; fi; }
info() { printf '==> %s\n' "$*"; }
ok()   { printf '  ✓ %s\n' "$*"; }
warn() { printf '  aviso: %s\n' "$*" >&2; }

# Instala el comando global `gremio2` en un directorio del PATH.
setup_command() {
  local url bin=""
  url="$(git -C "$SCRIPT_DIR" remote get-url origin 2>/dev/null || echo "https://github.com/PortalesCode/gremio-2.git")"
  for d in "$HOME/.local/bin" "$HOME/bin" "/usr/local/bin"; do
    case ":$PATH:" in
      *":$d:"*) if [ -w "$d" ] 2>/dev/null; then bin="$d"; break; fi ;;
    esac
  done
  if [ -z "$bin" ]; then
    warn "no encontré un directorio escribible en tu PATH (~/.local/bin). Creá ~/.local/bin, agregalo al PATH y reintentá."
    exit 1
  fi
  if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] escribir $bin/gremio2"; exit 0; fi
  cat > "$bin/gremio2" <<EOF
#!/usr/bin/env bash
# gremio2 — comando global, generado por install.sh --setup.
#   gremio2            instala Gremio 2 en el directorio actual
#   gremio2 update     actualiza el paquete (git pull)
#   gremio2 --version  muestra la versión
#   gremio2 <args>     pasa argumentos al instalador (--dry-run, --target, etc.)
# Si la carpeta del paquete se borra, la vuelve a clonar sola.
set -euo pipefail
GREMIO_DIR="\${GREMIO_DIR:-\$HOME/.local/share/gremio-2}"
GREMIO_URL="\${GREMIO_URL:-$url}"
if [ ! -x "\$GREMIO_DIR/install.sh" ]; then
  echo "Gremio 2 no está en \$GREMIO_DIR. Reinstalando el paquete..." >&2
  mkdir -p "\$(dirname "\$GREMIO_DIR")"
  git clone --depth 1 "\$GREMIO_URL" "\$GREMIO_DIR"
fi
case "\${1:-}" in
  update) git -C "\$GREMIO_DIR" pull --ff-only ;;
  --version|-v)
    echo "Gremio 2 (\$GREMIO_DIR)"
    git -C "\$GREMIO_DIR" log --oneline -1
    ;;
  *) exec "\$GREMIO_DIR/install.sh" "\$@" ;;
esac
EOF
  chmod +x "$bin/gremio2"
  ok "comando global instalado: $bin/gremio2"
  info "Probalo: cd <tu-repo> && gremio2"
  info "Actualizar el paquete: gremio2 update"
  exit 0
}

if [ "$SETUP" -eq 1 ]; then
  setup_command
fi

[ -d "$TARGET" ] || { echo "No existe el destino: $TARGET" >&2; exit 1; }
TARGET="$(cd "$TARGET" && pwd)"

verify_package() {
  for f in ".opencode/agents/lead.md" ".opencode/GREMIO.md" "opencode.json"; do
    [ -e "$SCRIPT_DIR/$f" ] || { echo "Paquete incompleto: falta $f" >&2; exit 1; }
  done
}
verify_package

# Copia recursiva de archivos, sobrescribiendo los del ecosistema pero sin borrar otros.
# Excluye artefactos que OpenCode genera en .opencode/ (node_modules, package.json, etc.).
copy_tree() {
  local src="$1" dst="$2"
  [ -d "$src" ] || return 0
  while IFS= read -r -d '' f; do
    local out="$dst/${f#"$src"/}"
    run mkdir -p "$(dirname "$out")"
    run cp "$f" "$out"
  done < <(find "$src" -type f \
      -not -path '*/node_modules/*' \
      -not -name 'package.json' \
      -not -name 'package-lock.json' \
      -not -name 'bun.lock' \
      -not -name '.gitignore' \
      -print0)
}

# Copia solo lo que no existe en destino (no pisa trabajo del usuario).
copy_missing() {
  local src="$1" dst="$2"
  [ -d "$src" ] || return 0
  while IFS= read -r -d '' f; do
    local out="$dst/${f#"$src"/}"
    [ -e "$out" ] && continue
    run mkdir -p "$(dirname "$out")"
    run cp "$f" "$out"
  done < <(find "$src" -type f \
      -not -path '*/node_modules/*' \
      -not -name 'package.json' \
      -not -name 'package-lock.json' \
      -not -name 'bun.lock' \
      -not -name '.gitignore' \
      -print0)
}

# .opencode/.gitignore: protege contra commitear los artefactos de OpenCode.
write_opencode_gitignore() {
  local d="$TARGET/.opencode"
  [ -d "$d" ] || return 0
  if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] escribir .opencode/.gitignore"; return 0; fi
  printf 'node_modules\npackage.json\npackage-lock.json\nbun.lock\n.gitignore\n' > "$d/.gitignore"
  ok ".opencode/.gitignore"
}

# Inyecta/actualiza el bloque Gremio 2 en AGENTS.md entre marcadores.
merge_agents_md() {
  local src="$SCRIPT_DIR/.opencode/GREMIO.md" dst="$TARGET/AGENTS.md"
  [ -f "$src" ] || { warn "no encontré .opencode/GREMIO.md"; return 0; }
  if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] inyectar bloque Gremio 2 en AGENTS.md"; return 0; fi
  local tool=""
  command -v node >/dev/null 2>&1 && tool="node"
  command -v python3 >/dev/null 2>&1 && [ -z "$tool" ] && tool="python3"
  if [ "$tool" = "node" ]; then
    node -e '
      const fs=require("fs");
      const [src,dst,START,END]=process.argv.slice(1);
      const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      const block=START+"\n"+fs.readFileSync(src,"utf8").trim()+"\n"+END;
      let cur=fs.existsSync(dst)?fs.readFileSync(dst,"utf8"):"";
      const re=new RegExp(esc(START)+"[\\s\\S]*?"+esc(END));
      if(re.test(cur)){cur=cur.replace(re,block);}
      else{cur=cur.trim()?cur.trimEnd()+"\n\n"+block+"\n":block+"\n";}
      fs.writeFileSync(dst,cur);
    ' "$src" "$dst" "$START_MARK" "$END_MARK"
    ok "bloque Gremio 2 en AGENTS.md"
  elif [ "$tool" = "python3" ]; then
    python3 -c '
import sys,re,os
src,dst,START,END=sys.argv[1:5]
block=START+"\n"+open(src,encoding="utf-8").read().strip()+"\n"+END
cur=open(dst,encoding="utf-8").read() if os.path.exists(dst) else ""
pat=re.escape(START)+r"[\s\S]*?"+re.escape(END)
if re.search(pat,cur): cur=re.sub(pat,lambda m:block,cur,count=1)
else: cur=(cur.rstrip()+"\n\n"+block+"\n") if cur.strip() else (block+"\n")
open(dst,"w",encoding="utf-8").write(cur)
' "$src" "$dst" "$START_MARK" "$END_MARK"
    ok "bloque Gremio en AGENTS.md"
  else
    warn "no hay node ni python3: no pude actualizar AGENTS.md"
  fi
}

# Mergea opencode.json (el proyecto gana en claves existentes).
merge_json() {
  local pkg="$1" proj="$2"
  [ -f "$pkg" ] || return 0
  if [ ! -f "$proj" ]; then run cp "$pkg" "$proj"; ok "opencode.json creado"; return 0; fi
  if [ "$DRY_RUN" -eq 1 ]; then echo "  [dry-run] mergear opencode.json"; return 0; fi
  local tool=""
  command -v node >/dev/null 2>&1 && tool="node"
  command -v python3 >/dev/null 2>&1 && [ -z "$tool" ] && tool="python3"
  if [ "$tool" = "node" ]; then
    node -e '
      const fs=require("fs");
      const [pkg,proj]=process.argv.slice(1);
      const a=JSON.parse(fs.readFileSync(pkg,"utf8"));
      const b=JSON.parse(fs.readFileSync(proj,"utf8"));
      b.mcp=Object.assign({},a.mcp||{},b.mcp||{});
      // Permisos gestionados por el ecosistema: se limpian y se re-aplican (evita denegaciones viejas).
      const ADMIN=["chrome-devtools","playwright","markitdown","headroom"];
      const perm={};
      for(const [k,v] of Object.entries(b.permission||{})){
        if(!ADMIN.some(p=>k.startsWith(p))) perm[k]=v;
      }
      b.permission=Object.assign(perm,a.permission||{});
      if(b.default_agent===undefined&&a.default_agent!==undefined)b.default_agent=a.default_agent;
      if(b.subagent_depth===undefined&&a.subagent_depth!==undefined)b.subagent_depth=a.subagent_depth;
      fs.writeFileSync(proj,JSON.stringify(b,null,2)+"\n");
      if(b.default_agent&&b.default_agent!=="lead"){process.stderr.write("  aviso: el proyecto define default_agent="+b.default_agent+". Para trabajar con el Gremio 2, cambiá a Lead (Tab) o poné default_agent: lead.\n");}
    ' "$pkg" "$proj"
    ok "opencode.json mergeado"
  elif [ "$tool" = "python3" ]; then
    python3 -c '
import json,sys
pkg,proj=sys.argv[1],sys.argv[2]
a=json.load(open(pkg)); b=json.load(open(proj))
b["mcp"]=dict(a.get("mcp",{}),**b.get("mcp",{}))
ADMIN=("chrome-devtools","playwright","markitdown","headroom")
perm={k:v for k,v in (b.get("permission") or {}).items() if not k.startswith(ADMIN)}
perm.update(a.get("permission") or {})
b["permission"]=perm
if "default_agent" not in b and a.get("default_agent") is not None: b["default_agent"]=a["default_agent"]
if "subagent_depth" not in b and a.get("subagent_depth") is not None: b["subagent_depth"]=a["subagent_depth"]
json.dump(b,open(proj,"w"),indent=2,ensure_ascii=False); open(proj,"a").write("\n")
import sys
da=b.get("default_agent")
if da and da!="lead": sys.stderr.write("  aviso: el proyecto define default_agent="+str(da)+". Para trabajar con el Gremio, cambiá a Lead (Tab) o poné default_agent: lead.\n")
' "$pkg" "$proj"
    ok "opencode.json mergeado"
  else
    warn "no hay node ni python3; mergeá opencode.json a mano"
  fi
}

info "Gremio 2 → $TARGET"
if [ ! -e "$TARGET/.git" ]; then
  warn "el destino no es un repo git. Gremio 2 necesita git para trabajar: al abrir OpenCode, el Lead te va a guiar (correr 'git init' o un ticket de setup con DevOps)."
fi
if [ "$SCRIPT_DIR" = "$TARGET" ]; then
  info "El paquete ya está en el destino; se omite la copia de archivos"
else
  info "Paso 1/3 — .opencode/ (agentes y skills)"
  copy_tree "$SCRIPT_DIR/.opencode" "$TARGET/.opencode"
  write_opencode_gitignore

  info "Paso 2/3 — board/ (solo lo faltante)"
  copy_missing "$SCRIPT_DIR/board" "$TARGET/board"
fi

info "Paso 3/3 — AGENTS.md (bloque Gremio 2) y opencode.json"
merge_agents_md
merge_json "$SCRIPT_DIR/opencode.json" "$TARGET/opencode.json"

if [ "$KEEP_PACKAGE" -eq 0 ] && [ "$SCRIPT_DIR" != "$TARGET" ] && [[ "$SCRIPT_DIR" == "$TARGET"/* ]]; then
  info "Auto-limpieza del paquete clonado dentro del destino"
  run rm -rf "$SCRIPT_DIR"
fi

echo
info "Listo. Reiniciá OpenCode para que todo tome efecto."
