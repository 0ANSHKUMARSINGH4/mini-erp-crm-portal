"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChallanNumber = generateChallanNumber;
const db_js_1 = require("../config/db.js");
async function generateChallanNumber() {
    const currentYear = new Date().getFullYear();
    const prefix = `CH-${currentYear}-`;
    // Find latest challan number matching prefix
    const latestChallan = await db_js_1.prisma.salesChallan.findFirst({
        where: {
            challanNumber: {
                startsWith: prefix
            }
        },
        orderBy: {
            challanNumber: 'desc'
        }
    });
    if (!latestChallan) {
        return `${prefix}0001`;
    }
    const parts = latestChallan.challanNumber.split('-');
    const seqStr = parts[parts.length - 1];
    const nextSeq = parseInt(seqStr, 10) + 1;
    return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
}
