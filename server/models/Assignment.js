const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: [true, 'La actividad es obligatoria'],
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'El niño es obligatorio'],
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El asignador es obligatorio'],
    },
    assignedByRole: {
      type: String,
      enum: ['tutor', 'profesional'],
      required: [true, 'El rol del asignador es obligatorio'],
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'skipped'],
      default: 'pending',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

assignmentSchema.index({ childId: 1, status: 1 });
assignmentSchema.index({ assignedBy: 1 });

const Assignment = mongoose.model('Assignment', assignmentSchema);
module.exports = Assignment;
