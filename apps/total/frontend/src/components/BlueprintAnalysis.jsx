import { useState, useRef, useCallback, useEffect } from 'react';
import {
    Plus, Trash2, Send, AlertTriangle,
    CheckCircle, XCircle, ChevronDown, ChevronUp,
    FileImage, Loader2, Eye, Settings, MessageSquare,
    X, BookOpen, Pencil, Check
} from 'lucide-react';

const API = 'http://localhost:5050';

// ── DropZone ───────────────────────────────────────────────────────────────────

const DropZone = ({ file, onFileChange }) => {
    const inputRef = useRef(null);
    const [dragging, setDragging] = useState(false);
    const isPdf = file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
    const previewUrl = file && !isPdf ? URL.createObjectURL(file) : null;

    const handleDrop = useCallback((e) => {
        e.preventDefault(); setDragging(false);
        const dropped = e.dataTransfer.files[0];
        if (dropped) onFileChange(dropped);
    }, [onFileChange]);

    return (
        <div
            className={`bp-dropzone ${dragging ? 'bp-dropzone--active' : ''} ${file ? 'bp-dropzone--filled' : ''}`}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => !file && inputRef.current?.click()}
        >
            <input ref={inputRef} type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files[0] && onFileChange(e.target.files[0])}
            />
            {file ? (
                <div className="bp-dropzone-preview">
                    {isPdf ? (
                        <div className="bp-pdf-preview">
                            <FileImage size={48} className="bp-pdf-icon" />
                            <p className="bp-pdf-name">{file.name}</p>
                            <p className="bp-pdf-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    ) : (
                        <img src={previewUrl} alt="Blueprint preview" className="bp-preview-img" />
                    )}
                    <div className="bp-preview-overlay">
                        <button className="bp-btn bp-btn--ghost bp-btn--sm"
                            onClick={(e) => { e.stopPropagation(); onFileChange(null); }}>
                            <Trash2 size={14} /> Cambiar plano
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bp-dropzone-empty">
                    <div className="bp-upload-icon"><FileImage size={32} /></div>
                    <p className="bp-upload-title">Arrastra tu plano aquí</p>
                    <p className="bp-upload-sub">o haz clic para seleccionar — PDF, PNG, JPG</p>
                </div>
            )}
        </div>
    );
};

// ── RestrictionsPanel ──────────────────────────────────────────────────────────

const RestrictionsPanel = ({ restrictions, onChange }) => {
    const add = () => onChange([...restrictions, { id: Date.now(), nombre: '', valor: '', descripcion: '' }]);
    const remove = (id) => onChange(restrictions.filter(r => r.id !== id));
    const update = (id, field, value) =>
        onChange(restrictions.map(r => r.id === id ? { ...r, [field]: value } : r));

    return (
        <div className="bp-section">
            <div className="bp-section-header">
                <h3 className="bp-section-title">Variables de Restricción</h3>
                <button className="bp-btn bp-btn--ghost bp-btn--sm" onClick={add}>
                    <Plus size={14} /> Agregar
                </button>
            </div>
            {restrictions.length === 0 && (
                <p className="bp-empty-hint">Agrega restricciones como "espesor mínimo de muro = 20 cm"</p>
            )}
            <div className="bp-restrictions-list">
                {restrictions.map((r) => (
                    <div key={r.id} className="bp-restriction-row">
                        <input className="form-input bp-input-name" placeholder="Nombre"
                            value={r.nombre} onChange={(e) => update(r.id, 'nombre', e.target.value)} />
                        <input className="form-input bp-input-value" placeholder="Valor"
                            value={r.valor} onChange={(e) => update(r.id, 'valor', e.target.value)} />
                        <input className="form-input bp-input-desc" placeholder="Descripción"
                            value={r.descripcion} onChange={(e) => update(r.id, 'descripcion', e.target.value)} />
                        <button className="bp-btn bp-btn--danger bp-btn--icon" onClick={() => remove(r.id)}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Analysis result sub-components ────────────────────────────────────────────

const Snapshot = ({ src }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bp-snapshot">
            <img
                src={`data:image/png;base64,${src}`}
                alt="Snapshot"
                className={`bp-snapshot-img ${expanded ? 'bp-snapshot-img--expanded' : ''}`}
                onClick={() => setExpanded(e => !e)}
                title={expanded ? 'Clic para reducir' : 'Clic para ampliar'}
            />
        </div>
    );
};

const ElementCard = ({ elemento }) => (
    <div className="bp-element-card glass card-hover">
        <div className="bp-element-header">
            <span className="bp-element-type">{elemento.tipo}</span>
            {elemento.dimensiones && <span className="bp-element-dim">{elemento.dimensiones}</span>}
        </div>
        <p className="bp-element-desc">{elemento.descripcion}</p>
        {elemento.ubicacion && <p className="bp-element-location"><Eye size={12} /> {elemento.ubicacion}</p>}
        {elemento.snapshot && <Snapshot src={elemento.snapshot} />}
    </div>
);

const RestrictionResult = ({ item }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className={`bp-restriction-result ${item.cumple ? 'bp-result--ok' : 'bp-result--fail'}`}>
            <button className="bp-result-toggle" onClick={() => setOpen(!open)}>
                <span className="bp-result-icon">
                    {item.cumple ? <CheckCircle size={16} className="text-green" />
                        : <XCircle size={16} className="text-red" />}
                </span>
                <span className="bp-result-name">{item.restriccion}</span>
                <span className="bp-result-status">{item.cumple ? 'CUMPLE' : 'NO CUMPLE'}</span>
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {open && (
                <div className="bp-result-detail">
                    <p>{item.comentario}</p>
                    {item.snapshot && <Snapshot src={item.snapshot} />}
                </div>
            )}
        </div>
    );
};

const AnalysisResults = ({ analysis }) => (
    <div className="bp-results">
        <div className="glass bp-result-section">
            <h3 className="bp-result-section-title">Resumen General</h3>
            <p className="bp-summary-text">{analysis.resumen}</p>
        </div>
        {analysis.alertas?.length > 0 && (
            <div className="bp-alerts-box">
                {analysis.alertas.map((a, i) => (
                    <div key={i} className="bp-alert-item"><AlertTriangle size={14} /><span>{a}</span></div>
                ))}
            </div>
        )}
        {analysis.elementos_encontrados?.length > 0 && (
            <div className="bp-result-section">
                <h3 className="bp-result-section-title">
                    Elementos Estructurales
                    <span className="bp-count-badge">{analysis.elementos_encontrados.length}</span>
                </h3>
                <div className="bp-elements-grid">
                    {analysis.elementos_encontrados.map((el, i) => <ElementCard key={i} elemento={el} />)}
                </div>
            </div>
        )}
        {analysis.restricciones_cruzadas?.length > 0 && (
            <div className="bp-result-section">
                <h3 className="bp-result-section-title">
                    Cruce de Restricciones
                    <span className="bp-count-badge">{analysis.restricciones_cruzadas.length}</span>
                </h3>
                <div className="bp-restrictions-results">
                    {analysis.restricciones_cruzadas.map((r, i) => <RestrictionResult key={i} item={r} />)}
                </div>
            </div>
        )}
        {analysis.observaciones?.length > 0 && (
            <div className="glass bp-result-section">
                <h3 className="bp-result-section-title">Observaciones</h3>
                <ul className="bp-obs-list">
                    {analysis.observaciones.map((obs, i) => <li key={i} className="bp-obs-item">{obs}</li>)}
                </ul>
            </div>
        )}
    </div>
);

// ── LocationSelect: custom dropdown (evita bugs de <select> nativo en dark theme) ──

const LocationSelect = ({ options, value, onChange, disabled, placeholder }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const selected = options.find(o => o.value === value);

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    return (
        <div className={`bp-loc-select ${disabled ? 'bp-loc-select--disabled' : ''}`} ref={ref}>
            <button type="button" className="bp-loc-select-btn"
                onClick={() => !disabled && setOpen(o => !o)}
                disabled={disabled}>
                <span>{selected?.label || placeholder || '—'}</span>
                <ChevronDown size={13} />
            </button>
            {open && (
                <ul className="bp-loc-select-list">
                    {options.map(o => (
                        <li key={o.value}
                            className={`bp-loc-select-item ${o.value === value ? 'bp-loc-select-item--on' : ''}`}
                            onMouseDown={(e) => { e.preventDefault(); onChange(o.value); setOpen(false); }}>
                            {o.label}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// ── InlineEdit: renombrar dirección o capítulo ─────────────────────────────────

const InlineEdit = ({ value, onSave, nameClass }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    const start = (e) => { e.stopPropagation(); setDraft(value); setEditing(true); };
    const cancel = (e) => { e?.stopPropagation(); setEditing(false); };
    const save = (e) => {
        e?.stopPropagation();
        if (draft.trim() && draft.trim() !== value) onSave(draft.trim());
        setEditing(false);
    };

    if (editing) {
        return (
            <span className="bp-inline-edit-row" onClick={(e) => e.stopPropagation()}>
                <input className="form-input" value={draft} autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') save(e); if (e.key === 'Escape') cancel(e); }} />
                <button className="bp-btn bp-btn--icon bp-btn--ghost" onClick={save}><Check size={13} /></button>
                <button className="bp-btn bp-btn--icon bp-btn--ghost" onClick={cancel}><X size={13} /></button>
            </span>
        );
    }
    return (
        <>
            <span className={nameClass}>{value}</span>
            <button className="bp-btn bp-btn--icon bp-btn--ghost"
                style={{ opacity: 0.4, flexShrink: 0 }}
                onClick={start} title="Renombrar">
                <Pencil size={13} />
            </button>
        </>
    );
};

// ── SkillEditModal ─────────────────────────────────────────────────────────────

const SkillEditModal = ({ skill, dirId, chapterId, directions, onSave, onClose }) => {
    const [name, setName] = useState(skill.name || '');
    const [description, setDescription] = useState(skill.description || '');
    const [instructions, setInstructions] = useState(
        Array.isArray(skill.instructions) ? skill.instructions.join('\n') : (skill.instructions || skill.prompt || '')
    );
    const [usageExample, setUsageExample] = useState(skill.usage_example || '');
    const [active, setActive] = useState(skill.active);
    const [selectedDirId, setSelectedDirId] = useState(dirId);
    const [selectedChapterId, setSelectedChapterId] = useState(chapterId);

    const selectedDir = directions.find(d => d.id === selectedDirId);
    const availableChapters = selectedDir?.chapters || [];

    const handleDirChange = (newDirId) => {
        setSelectedDirId(newDirId);
        const dir = directions.find(d => d.id === newDirId);
        setSelectedChapterId(dir?.chapters[0]?.id || '');
    };

    const handleSave = () => {
        const instrArray = instructions.split('\n').map(l => l.trim()).filter(Boolean);
        onSave({
            name: name.trim(),
            description: description.trim(),
            instructions: instrArray,
            usage_example: usageExample.trim(),
            active,
            newChapterId: selectedChapterId !== chapterId ? selectedChapterId : null,
        });
    };

    return (
        <div className="bp-modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
            <div className="bp-modal bp-skill-edit-modal" onClick={(e) => e.stopPropagation()}>
                <div className="bp-modal-header">
                    <div className="bp-modal-title">
                        <Pencil size={16} /><span>Editar Skill</span>
                    </div>
                    <button className="bp-btn bp-btn--icon bp-btn--ghost" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="bp-modal-body">
                    <div className="bp-form-group">
                        <label className="bp-form-label">Ubicación</label>
                        <div className="bp-location-selects">
                            <LocationSelect
                                options={directions.map(d => ({ value: d.id, label: d.name }))}
                                value={selectedDirId}
                                onChange={handleDirChange}
                            />
                            <LocationSelect
                                options={availableChapters.map(ch => ({ value: ch.id, label: ch.name }))}
                                value={selectedChapterId}
                                onChange={setSelectedChapterId}
                                disabled={availableChapters.length === 0}
                                placeholder="Sin capítulos"
                            />
                        </div>
                    </div>

                    <label className="bp-skill-edit-active">
                        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
                        <span>Skill activo</span>
                        <span className={`bp-active-pill ${active ? 'bp-active-pill--on' : 'bp-active-pill--off'}`}>
                            {active ? 'ACTIVO' : 'INACTIVO'}
                        </span>
                    </label>

                    <div className="bp-form-group">
                        <label className="bp-form-label">Nombre del skill
                            <span className="bp-form-hint-inline">en minúsculas</span>
                        </label>
                        <input className="form-input" value={name} autoFocus
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: ignorar mampostería" />
                    </div>

                    <div className="bp-form-group">
                        <label className="bp-form-label">Descripción</label>
                        <p className="bp-form-hint">Una frase concisa sobre qué hace este skill.</p>
                        <input className="form-input" value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Excluye del análisis todos los elementos de mampostería." />
                    </div>

                    <div className="bp-form-group">
                        <label className="bp-form-label">Instrucciones para la IA</label>
                        <p className="bp-form-hint">Una instrucción por línea. Sé específico sobre la tarea, el formato de salida y los criterios de éxito.</p>
                        <textarea className="form-input bp-skill-prompt-textarea"
                            value={instructions} onChange={(e) => setInstructions(e.target.value)}
                            placeholder={"Do NOT report masonry elements.\nSkip annotations above wall lines.\nReturn only structural elements in JSON."} rows={5} />
                    </div>

                    <div className="bp-form-group">
                        <label className="bp-form-label">Ejemplo de uso</label>
                        <p className="bp-form-hint">Describe cuándo debe aplicarse esta habilidad.</p>
                        <textarea className="form-input bp-skill-prompt-textarea"
                            value={usageExample} onChange={(e) => setUsageExample(e.target.value)}
                            placeholder="Ej: Usar cuando el análisis se enfoca en estructura de concreto." rows={2} />
                    </div>
                </div>

                <div className="bp-modal-footer">
                    <button className="bp-btn bp-btn--ghost" onClick={onClose}>Cancelar</button>
                    <button className="bp-btn bp-btn--primary"
                        onClick={handleSave}
                        disabled={!name.trim() || !description.trim()}>
                        <Check size={15} /> Guardar cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── SkillsModal ────────────────────────────────────────────────────────────────

const SkillsModal = ({ onClose, onDirectionsChange }) => {
    const [directions, setDirections] = useState([]);
    const [openDirs, setOpenDirs] = useState({});
    const [openChapters, setOpenChapters] = useState({});
    const [editingSkillData, setEditingSkillData] = useState(null);
    const [newDirName, setNewDirName] = useState('');
    const [newChapter, setNewChapter] = useState({});
    const [newSkill, setNewSkill] = useState({});

    const reload = async () => {
        const res = await fetch(`${API}/api/skills`);
        const data = await res.json();
        const dirs = data.directions || [];
        setDirections(dirs);
        onDirectionsChange(dirs);
    };

    useEffect(() => { reload(); }, []);

    const api = async (method, path, body) => {
        await fetch(`${API}${path}`, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        reload();
    };

    // Direction
    const addDirection = async () => {
        const name = newDirName.trim();
        if (!name) return;
        await api('POST', '/api/skills/direction', { name });
        setNewDirName('');
    };
    const renameDirection = (id, name) => api('PATCH', `/api/skills/direction/${id}`, { name });
    const deleteDirection = (id) => api('DELETE', `/api/skills/direction/${id}`);

    // Chapter
    const addChapter = async (dirId) => {
        const name = (newChapter[dirId] || '').trim();
        if (!name) return;
        await api('POST', '/api/skills/chapter', { direction_id: dirId, name });
        setNewChapter(p => ({ ...p, [dirId]: '' }));
    };
    const renameChapter = (id, name) => api('PATCH', `/api/skills/chapter/${id}`, { name });
    const deleteChapter = (id) => api('DELETE', `/api/skills/chapter/${id}`);

    // Skill
    const addSkill = async (chapterId) => {
        const s = newSkill[chapterId] || {};
        if (!s.name?.trim() || !s.description?.trim()) return;
        await api('POST', '/api/skills/skill', {
            chapter_id: chapterId,
            name: s.name.trim(),
            description: s.description.trim(),
            instructions: [],
            usage_example: '',
        });
        setNewSkill(p => ({ ...p, [chapterId]: { name: '', description: '' } }));
    };
    const toggleSkill = (id) => api('PATCH', `/api/skills/skill/${id}/toggle`);
    const deleteSkill = (id) => api('DELETE', `/api/skills/skill/${id}`);
    const saveEditSkill = async (id, { newChapterId, ...editData }) => {
        const headers = { 'Content-Type': 'application/json' };
        await fetch(`${API}/api/skills/skill/${id}`, {
            method: 'PATCH', headers, body: JSON.stringify(editData),
        });
        if (newChapterId) {
            await fetch(`${API}/api/skills/skill/${id}/move`, {
                method: 'PATCH', headers, body: JSON.stringify({ chapter_id: newChapterId }),
            });
        }
        await reload();
        setEditingSkillData(null);
    };

    const toggleDir = (id) => setOpenDirs(p => ({ ...p, [id]: !p[id] }));
    const toggleChapter = (id) => setOpenChapters(p => ({ ...p, [id]: !p[id] }));

    return (
        <>
            <div className="bp-modal-overlay" onClick={onClose}>
                <div className="bp-modal bp-modal--lg" onClick={(e) => e.stopPropagation()}>
                    <div className="bp-modal-header">
                        <div className="bp-modal-title"><BookOpen size={18} /><span>Gestionar Skills</span></div>
                        <button className="bp-btn bp-btn--icon bp-btn--ghost" onClick={onClose}><X size={18} /></button>
                    </div>

                    <div className="bp-modal-body">
                        {directions.map((dir) => (
                            <div key={dir.id} className="bp-direction">
                                <div className="bp-direction-header" onClick={() => toggleDir(dir.id)}>
                                    <span className="bp-dir-toggle">
                                        {openDirs[dir.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </span>
                                    <InlineEdit value={dir.name} onSave={(n) => renameDirection(dir.id, n)} nameClass="bp-dir-name" />
                                    <span className="bp-chapter-count" style={{ marginLeft: 'auto', marginRight: '0.25rem' }}>
                                        {dir.chapters.length} cap · {dir.chapters.reduce((a, c) => a + c.skills.filter(s => s.active).length, 0)} activos
                                    </span>
                                    <button className="bp-btn bp-btn--icon bp-btn--ghost" style={{ opacity: 0.4 }}
                                        onClick={(e) => { e.stopPropagation(); deleteDirection(dir.id); }}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {openDirs[dir.id] && (
                                    <div className="bp-direction-body">
                                        {dir.chapters.map((ch) => (
                                            <div key={ch.id} className="bp-chapter">
                                                <div className="bp-chapter-header" onClick={() => toggleChapter(ch.id)}>
                                                    <span className="bp-chapter-toggle">
                                                        {openChapters[ch.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </span>
                                                    <InlineEdit value={ch.name} onSave={(n) => renameChapter(ch.id, n)} nameClass="bp-chapter-name" />
                                                    <span className="bp-chapter-count" style={{ marginLeft: 'auto', marginRight: '0.25rem' }}>
                                                        {ch.skills.filter(s => s.active).length}/{ch.skills.length}
                                                    </span>
                                                    <button className="bp-btn bp-btn--icon bp-btn--ghost bp-chapter-delete"
                                                        onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id); }}>
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>

                                                {openChapters[ch.id] && (
                                                    <div className="bp-chapter-body">
                                                        {ch.skills.length === 0 && (
                                                            <p className="bp-empty-hint">Sin skills — agrega uno abajo.</p>
                                                        )}
                                                        {ch.skills.map((skill) => (
                                                            <div key={skill.id} className="bp-skill-row">
                                                                <label className="bp-skill-toggle">
                                                                    <input type="checkbox" checked={skill.active}
                                                                        onChange={() => toggleSkill(skill.id)} />
                                                                    <span className={`bp-skill-name ${!skill.active ? 'bp-skill-inactive' : ''}`}>
                                                                        {skill.name}
                                                                    </span>
                                                                </label>
                                                                <span className="bp-skill-prompt-preview" title={skill.description || skill.prompt}>
                                                                    {skill.description || skill.prompt}
                                                                </span>
                                                                <div className="bp-skill-actions">
                                                                    <button className="bp-btn bp-btn--icon bp-btn--ghost"
                                                                        onClick={() => setEditingSkillData({ skill, dirId: dir.id, chapterId: ch.id })}
                                                                        title="Editar skill">
                                                                        <Pencil size={13} />
                                                                    </button>
                                                                    <button className="bp-btn bp-btn--icon bp-btn--danger"
                                                                        onClick={() => deleteSkill(skill.id)}
                                                                        title="Eliminar skill">
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        <div className="bp-add-skill-form">
                                                            <input className="form-input" placeholder="Nombre del skill (en minúsculas)"
                                                                value={newSkill[ch.id]?.name || ''}
                                                                onChange={(e) => setNewSkill(p => ({ ...p, [ch.id]: { ...(p[ch.id] || {}), name: e.target.value } }))} />
                                                            <input className="form-input" placeholder="Descripción breve"
                                                                value={newSkill[ch.id]?.description || ''}
                                                                onChange={(e) => setNewSkill(p => ({ ...p, [ch.id]: { ...(p[ch.id] || {}), description: e.target.value } }))} />
                                                            <button className="bp-btn bp-btn--primary bp-btn--sm" onClick={() => addSkill(ch.id)}>
                                                                <Plus size={14} /> Agregar skill
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        <div className="bp-add-chapter-form bp-add-chapter-form--nested">
                                            <input className="form-input" placeholder="Nuevo capítulo (ej: Estructura)"
                                                value={newChapter[dir.id] || ''}
                                                onChange={(e) => setNewChapter(p => ({ ...p, [dir.id]: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && addChapter(dir.id)} />
                                            <button className="bp-btn bp-btn--ghost bp-btn--sm" onClick={() => addChapter(dir.id)}>
                                                <Plus size={14} /> Capítulo
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        <div className="bp-add-direction-form">
                            <input className="form-input" placeholder="Nueva dirección (ej: Legal)"
                                value={newDirName}
                                onChange={(e) => setNewDirName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addDirection()} />
                            <button className="bp-btn bp-btn--ghost bp-btn--sm" onClick={addDirection}>
                                <Plus size={14} /> Nueva dirección
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {editingSkillData && (
                <SkillEditModal
                    skill={editingSkillData.skill}
                    dirId={editingSkillData.dirId}
                    chapterId={editingSkillData.chapterId}
                    directions={directions}
                    onSave={(data) => saveEditSkill(editingSkillData.skill.id, data)}
                    onClose={() => setEditingSkillData(null)}
                />
            )}
        </>
    );
};

// ── ChatPanel ──────────────────────────────────────────────────────────────────

const ChatPanel = ({ analysis }) => {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text }]);
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, analysis_context: analysis || null }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.error ? `Error: ${data.error}` : data.reply }]);
        } catch {
            setMessages(prev => [...prev, { role: 'ai', text: 'No se pudo conectar al servidor.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`bp-chat-panel glass ${open ? 'bp-chat-panel--open' : ''}`}>
            <button className="bp-chat-header" onClick={() => setOpen(!open)}>
                <MessageSquare size={16} />
                <span>Chat con IA</span>
                {analysis && <span className="bp-chat-context-badge">con contexto del análisis</span>}
                {open ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            {open && (
                <div className="bp-chat-body">
                    <div className="bp-chat-messages">
                        {messages.length === 0 && (
                            <p className="bp-chat-hint">
                                {analysis ? 'Pregunta sobre el plano analizado o cualquier tema arquitectónico.'
                                    : 'Haz preguntas sobre arquitectura o analiza un plano primero.'}
                            </p>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`bp-chat-msg bp-chat-msg--${m.role}`}>
                                <span className="bp-chat-msg-label">{m.role === 'user' ? 'Tú' : 'IA'}</span>
                                <p className="bp-chat-msg-text">{m.text}</p>
                            </div>
                        ))}
                        {loading && (
                            <div className="bp-chat-msg bp-chat-msg--ai">
                                <span className="bp-chat-msg-label">IA</span>
                                <Loader2 size={16} className="animate-spin" />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="bp-chat-input-row">
                        <input className="form-input bp-chat-input" placeholder="Escribe tu pregunta..."
                            value={input} onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()} />
                        <button className="bp-btn bp-btn--primary bp-btn--icon" onClick={send}
                            disabled={loading || !input.trim()}>
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────

const BlueprintAnalysis = () => {
    const [file, setFile] = useState(null);
    const [restrictions, setRestrictions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [directions, setDirections] = useState([]);
    const [showSkillsModal, setShowSkillsModal] = useState(false);

    useEffect(() => {
        fetch(`${API}/api/skills`)
            .then(r => r.json())
            .then(d => setDirections(d.directions || []))
            .catch(() => {});
    }, []);

    const activeSkills = directions.flatMap(dir =>
        dir.chapters.flatMap(ch =>
            ch.skills.filter(s => s.active).map(s => ({ name: s.name, chapter: ch.name, direction: dir.name }))
        )
    );

    const handleAnalyze = async () => {
        if (!file) { setError('Debes subir un plano antes de analizar.'); return; }
        setLoading(true); setError(null); setAnalysis(null);
        const formData = new FormData();
        formData.append('blueprint', file);
        formData.append('restrictions', JSON.stringify(
            restrictions.map(({ nombre, valor, descripcion }) => ({ nombre, valor, descripcion }))
        ));
        try {
            const res = await fetch(`${API}/api/analyze-blueprint`, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok || data.error) setError(data.error || 'Error desconocido.');
            else setAnalysis(data.analysis);
        } catch {
            setError('No se pudo conectar al servidor. ¿Está corriendo blueprint_server.py en el puerto 5050?');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bp-page">
            <div className="dashboard-header">
                <div>
                    <h2 className="section-title">Análisis de Planos</h2>
                    <p className="section-subtitle">
                        Sube un plano arquitectónico, define restricciones y obtén análisis estructural automático
                    </p>
                </div>
            </div>

            <div className="bp-skills-bar glass">
                <span className="bp-skills-label">Skills activos:</span>
                <div className="bp-skills-badges">
                    {activeSkills.length === 0
                        ? <span className="bp-empty-hint" style={{ margin: 0 }}>Sin skills activos</span>
                        : activeSkills.map((s, i) => (
                            <span key={i} className="bp-skill-badge" title={`${s.direction} › ${s.chapter}`}>
                                {s.name}
                            </span>
                        ))
                    }
                </div>
                <button className="bp-btn bp-btn--ghost bp-btn--sm bp-skills-manage-btn"
                    onClick={() => setShowSkillsModal(true)}>
                    <Settings size={14} /> Gestionar Skills
                </button>
            </div>

            <div className="bp-layout">
                <div className="bp-left">
                    <div className="bp-section">
                        <h3 className="bp-section-title">Plano Arquitectónico</h3>
                        <DropZone file={file} onFileChange={setFile} />
                    </div>
                    <RestrictionsPanel restrictions={restrictions} onChange={setRestrictions} />
                    {error && (
                        <div className="bp-error-box">
                            <AlertTriangle size={16} /><span>{error}</span>
                        </div>
                    )}
                    <button className="bp-btn bp-btn--primary bp-btn--full" onClick={handleAnalyze} disabled={loading}>
                        {loading ? <><Loader2 size={16} className="animate-spin" /> Analizando...</>
                            : <><Send size={16} /> Analizar Plano</>}
                    </button>
                </div>

                <div className="bp-right">
                    {loading && (
                        <div className="bp-loading-state glass">
                            <Loader2 size={32} className="animate-spin bp-loading-icon" />
                            <p className="bp-loading-text">Analizando plano con IA...</p>
                            <p className="bp-loading-sub">Aplicando skills y restricciones activos</p>
                        </div>
                    )}
                    {!loading && !analysis && (
                        <div className="bp-empty-state glass">
                            <FileImage size={48} className="bp-empty-icon" />
                            <p className="bp-empty-title">Sin análisis aún</p>
                            <p className="bp-empty-sub">Sube un plano y presiona "Analizar Plano"</p>
                        </div>
                    )}
                    {!loading && analysis && <AnalysisResults analysis={analysis} />}
                </div>
            </div>

            <ChatPanel analysis={analysis} />

            {showSkillsModal && (
                <SkillsModal
                    onClose={() => setShowSkillsModal(false)}
                    onDirectionsChange={setDirections}
                />
            )}
        </div>
    );
};

export default BlueprintAnalysis;
