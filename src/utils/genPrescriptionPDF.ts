import { PDFDocument, RGB, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { Patient } from '../models/patient';
import { Doctor } from '../models/doctor';
import { firebaseApp } from './firebase.utils';
import { Prescription } from '../models/prescription';
import { getToday } from './data.processing';
import axios from 'axios';
import { getDownloadURL } from 'firebase-admin/storage';

type PrescriptionPDF = {
    patient: Patient;
    doctor: Doctor;
    prescriptions: Prescription[];
}

export async function generatePrescriptionPDF(props: PrescriptionPDF): Promise<string> {
    const { patient, doctor, prescriptions } = props;
    const pageWidth = 790, pageHeight = 850,
        horizontalMargin = 50, verticalMargin = 70,
        ContentWidth = pageWidth - horizontalMargin,
        middleMargin = pageWidth * 0.5,
        ContentHeight = pageHeight - verticalMargin;
    const underlineThickness = 13;
    const normalSpacing = 15;
    const bigSpacing = 30;

    const titleSize = 30;
    const subtitleSize = 18;
    const normalSize = 14;

    const mainColor = rgb(0.65, 0.05, 0.3);
    const secondaryColor = rgb(1, 0.5, 0.2);
    const lightBlue = rgb(0, 0, 0.5);
    const black = rgb(0, 0, 0);
    const watermarkColor = rgb(0.95, 0.1, 0.1);

    let currentY = ContentHeight;

    try {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Load fonts
        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

        const writeText = ({ text, x = horizontalMargin, y, size = normalSize, font = timesRomanFont, color = black, opacity = 0.8 }: { text: string, x?: number, y: number, size?: number, font?: any, color?: RGB, opacity?: number }) => {
            page.drawText(text, { x, y, size, font, color, opacity: opacity });
        };

        const drawLine = ({ startX = 0, startY, endX = middleMargin, endY, thickness, color = secondaryColor, opacity }: {
            startX?: number; startY: number, endX?: number, endY?: number, thickness: number, color?: RGB, opacity?: number
        }) => {
            page.drawLine({
                start: { x: startX, y: startY },
                end: { x: endX, y: endY || startY },
                thickness: thickness,
                color, opacity
            });
        };

        // Add watermark
        writeText({ x: 300, y: 200, size: 50, font: timesRomanFont, color: watermarkColor, text: 'ZMR', opacity: 0.4 });

        // Title
        writeText({
            text: 'Zomujo Foundation', x: middleMargin * 0.7, y: currentY, size: titleSize, font: timesBoldFont, color: mainColor
        });
        currentY -= normalSpacing;

        // Horizontal line under the title
        drawLine({ startY: currentY, thickness: underlineThickness, color: mainColor });
        drawLine({
            startX: middleMargin,
            endX: pageWidth,
            startY: currentY,
            thickness: underlineThickness, color: secondaryColor
        });
        currentY -= (underlineThickness + normalSpacing);

        // Prescription Info
        writeText({ text: 'Prescription No.', x: horizontalMargin, y: currentY, size: normalSize, font: timesBoldFont, color: mainColor });
        writeText({ text: 'Prescription Date', x: middleMargin, y: currentY, size: normalSize, font: timesBoldFont });

        currentY -= (normalSpacing);

        writeText({ text: (Math.random() * 1000).toString(), x: horizontalMargin, color: mainColor, y: currentY });
        writeText({ text: getToday(), x: middleMargin, y: currentY });
        currentY -= (normalSpacing);

        drawLine({ startY: currentY, thickness: underlineThickness });
        currentY -= (underlineThickness + normalSpacing);

        // Patient Info
        writeText({ text: 'Patient Information', y: currentY, size: subtitleSize, font: timesBoldFont, color: mainColor });
        currentY -= normalSpacing;

        writeText({ text: 'Name', x: horizontalMargin, y: currentY, size: normalSize, font: timesBoldFont, color: mainColor });
        writeText({ text: 'Age', x: middleMargin, color: mainColor, y: currentY, size: normalSize, font: timesBoldFont });

        currentY -= normalSpacing;
        writeText({ text: `${patient.firstName} ${patient.lastName}`, x: horizontalMargin, y: currentY });
        writeText({ text: patient.dob, x: middleMargin, y: currentY });

        currentY -= bigSpacing;

        writeText({ text: 'Email', x: horizontalMargin, y: currentY, size: normalSize, font: timesBoldFont, color: mainColor });
        writeText({ text: 'Gender', x: middleMargin, y: currentY, size: normalSize, font: timesBoldFont, color: mainColor });
        currentY -= normalSpacing;

        writeText({ text: patient.email, x: horizontalMargin, y: currentY });
        writeText({ text: patient.gender, x: middleMargin, y: currentY });
        currentY -= bigSpacing;

        writeText({ text: 'Allergies', y: currentY, size: normalSize, font: timesBoldFont, color: mainColor });
        currentY -= normalSpacing;

        writeText({ text: patient.allergies !== undefined ? patient.allergies.toString() : "None", x: horizontalMargin, y: currentY });
        currentY -= bigSpacing;

        drawLine({ startY: currentY, thickness: underlineThickness });
        currentY -= bigSpacing * 2;

        // Medications
        writeText({ text: 'List of Prescribed Medications', y: currentY, size: subtitleSize, font: timesBoldFont, color: mainColor, });
        currentY -= bigSpacing;

        const tableTop = currentY;
        const rowHeight = bigSpacing;
        const tab = 50;


        writeText({ text: 'Medication/Drug', x: tab, y: tableTop, size: normalSize, font: timesBoldFont, color: mainColor });
        writeText({ text: 'Dosage', x: tab * 6, y: tableTop, size: normalSize, font: timesBoldFont, color: mainColor });
        writeText({ text: 'Route', x: tab * 8, y: tableTop, size: normalSize, font: timesBoldFont, color: mainColor });
        writeText({ text: 'Frequency', x: tab * 11, y: tableTop, size: normalSize, font: timesBoldFont, color: mainColor });
        drawLine({
            startX: horizontalMargin,
            endX: ContentWidth,
            startY: currentY,
            thickness: rowHeight,
            color: lightBlue,
            opacity: 0.2
        })

        prescriptions.forEach((presc, index) => {
            currentY = tableTop - (index + 1) * rowHeight;
            drawLine({
                startX: horizontalMargin,
                endX: ContentWidth,
                startY: currentY,
                thickness: rowHeight,
                color: lightBlue,
                opacity: 0.05
            })
            drawLine({
                startX: horizontalMargin,
                endX: ContentWidth,
                startY: currentY - rowHeight * 0.5,
                thickness: 1,
                color: black,
                opacity: 0.2
            })
            writeText({ text: presc.medicine, x: tab, y: currentY });
            writeText({ text: presc.dosage, x: tab * 6, y: currentY });
            writeText({ text: presc.instructions, x: tab * 8, y: currentY });
            writeText({ text: presc.repeat, x: tab * 11, y: currentY });
        });
        drawLine({
            startX: horizontalMargin, endX: horizontalMargin, startY: tableTop + rowHeight * 0.5, endY: currentY - rowHeight * 0.5, thickness: 1, color: lightBlue, opacity: 0.1
        });
        drawLine({
            startX: (tab * 6) - 25, endX: (tab * 6) - 25, startY: tableTop + rowHeight * 0.5, endY: currentY - rowHeight * 0.5, thickness: 1, color: lightBlue, opacity: 0.1
        });
        drawLine({
            startX: (tab * 8) - 25, endX: (tab * 8) - 25, startY: tableTop + rowHeight * 0.5, endY: currentY - rowHeight * 0.5, thickness: 1, color: lightBlue, opacity: 0.1
        });
        drawLine({
            startX: (tab * 11) - 25, endX: tab * 11 - 25, startY: tableTop + rowHeight * 0.5, endY: currentY - rowHeight * 0.5, thickness: 1, color: lightBlue, opacity: 0.1
        });

        currentY -= bigSpacing * 2;

        drawLine({ startY: currentY, thickness: underlineThickness });
        currentY -= (underlineThickness + normalSpacing);

        // Doctor Info
        writeText({ text: 'Physician Name', y: currentY, size: normalSize, font: timesBoldFont, color: mainColor });
        writeText({ text: 'Physician Phone Number', x: middleMargin, y: currentY, size: normalSize, font: timesBoldFont, color: mainColor });
        currentY -= normalSpacing;

        writeText({ text: `${doctor.firstName} ${doctor.lastName}`, y: currentY });
        writeText({ text: doctor.contact, x: middleMargin, y: currentY });
        currentY -= bigSpacing;

        writeText({ text: 'Physician Signature', y: currentY, size: normalSize, font: timesBoldFont, color: mainColor });
        writeText({ text: 'Physician Email', x: middleMargin, y: currentY, size: normalSize, font: timesBoldFont, color: mainColor });
        currentY -= normalSpacing;

        writeText({ text: doctor.email, x: middleMargin, y: currentY });


        const signatureBytes = await fetchImageFromFirebase(doctor.signaturePath);
        const signatureImageEmbed = await pdfDoc.embedPng(signatureBytes);
        page.drawImage(signatureImageEmbed, {
            x: 50,
            y: currentY - 40,
            width: 100,
            height: 40,
        });

        currentY -= bigSpacing * 2;
        writeText({ text: getToday(), y: currentY });

        // Save the PDF to file
        const pdfBytes = await pdfDoc.save();
        const buffer = Buffer.from(pdfBytes);
        const file = firebaseApp.storage().bucket().file(`prescriptions/${patient.firstName}`);
        await file.save(buffer, {
            metadata: {
                contentType: 'application/pdf'
            }
        });
        return await getDownloadURL(file);
    } catch (error) {
        console.error("Error generating pdf: ", error);
        throw error;
    }
}

async function fetchImageFromFirebase(url: string): Promise<Uint8Array> {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return new Uint8Array(response.data);
}