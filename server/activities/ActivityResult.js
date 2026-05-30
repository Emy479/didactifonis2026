const mongoose = require('mongoose');

// Capa 1 educativa — NO clínica. Sin datos de salud ni scoring clínico.
const activityResultSchema = new mongoose.Schema(
  {
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: [true, 'El assignment es obligatorio'],
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Child',
      required: [true, 'El niño es obligatorio'],
    },
    activityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: [true, 'La actividad es obligatoria'],
    },
    schemaVersion: {
      type: String,
      default: '1.0',
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    passed: {
      type: Boolean,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    durationSeconds: {
      type: Number,
      min: 0,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

activityResultSchema.index({ childId: 1 });
activityResultSchema.index({ assignmentId: 1 });

const ActivityResult = mongoose.model('ActivityResult', activityResultSchema);
module.exports = ActivityResult;
