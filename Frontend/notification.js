const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        required: true,
        index: true 
    },
    tipo: { 
        type: String, 
        enum: ['reserva', 'cancelacion', 'recordatorio', 'sistema', 'promocion'],
        required: true 
    },
    titulo: { 
        type: String, 
        required: true 
    },
    mensaje: { 
        type: String, 
        required: true 
    },
    leida: { 
        type: Boolean, 
        default: false 
    },
    reservaId: { 
        type: String,
        default: null 
    },
    icono: {
        type: String,
        default: ''
    },
    prioridad: {
        type: String,
        enum: ['baja', 'media', 'alta'],
        default: 'media'
    }
}, { 
    timestamps: true 
});

// Índice compuesto para consultas eficientes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, leida: 1 });

module.exports = mongoose.model
