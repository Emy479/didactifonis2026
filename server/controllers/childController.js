const Child = require('../models/Child');

// ── POST /api/children — crear un niño/niña ─────────────────────────────────
async function createChild(req, res, next) {
  try {
    const { name, birthDate, avatarId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const child = await Child.create({
      tutorId: req.user._id,
      name: name.trim(),
      birthDate: birthDate || null,
      avatarId: avatarId || 'nino-1',
    });

    return res.status(201).json(child);
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/children — listar niños/niñas del tutor ────────────────────────
async function getChildren(req, res, next) {
  try {
    const children = await Child.find({
      tutorId: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    return res.status(200).json(children);
  } catch (err) {
    return next(err);
  }
}

// ── GET /api/children/:id — obtener un niño/niña específico ─────────────────
async function getChild(req, res, next) {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) {
      return res.status(404).json({ message: 'Niño/niña no encontrado' });
    }

    // Verificar propiedad
    if (!child.tutorId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Sin permiso para acceder a este recurso' });
    }

    return res.status(200).json(child);
  } catch (err) {
    return next(err);
  }
}

// ── PUT /api/children/:id — actualizar un niño/niña ─────────────────────────
async function updateChild(req, res, next) {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) {
      return res.status(404).json({ message: 'Niño/niña no encontrado' });
    }

    // Verificar propiedad
    if (!child.tutorId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Sin permiso para modificar este recurso' });
    }

    const { name, birthDate, avatarId } = req.body;

    // Solo actualizar campos enviados
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: 'El nombre no puede estar vacío' });
      }
      child.name = name.trim();
    }

    if (birthDate !== undefined) {
      child.birthDate = birthDate || null;
    }

    if (avatarId !== undefined) {
      if (!['nino-1', 'nino-2', 'nina-1', 'nina-2'].includes(avatarId)) {
        return res.status(400).json({ message: 'avatarId inválido' });
      }
      child.avatarId = avatarId;
    }

    await child.save();

    return res.status(200).json(child);
  } catch (err) {
    return next(err);
  }
}

// ── DELETE /api/children/:id — baja lógica de un niño/niña ──────────────────
async function deleteChild(req, res, next) {
  try {
    const child = await Child.findById(req.params.id);

    if (!child) {
      return res.status(404).json({ message: 'Niño/niña no encontrado' });
    }

    // Verificar propiedad
    if (!child.tutorId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Sin permiso para eliminar este recurso' });
    }

    // Baja lógica
    child.isActive = false;
    await child.save();

    return res.status(200).json({ message: 'Niño/niña desactivado correctamente' });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createChild,
  getChildren,
  getChild,
  updateChild,
  deleteChild,
};
