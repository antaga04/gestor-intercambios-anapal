import { User } from '@/api/models/user';
import { hashPassword } from '@/utils/password';

const DEMO_PASSWORD = 'Demo1234';

const DEMO_ADMONS = [
    { receptorNumber: '10001', name: 'Administración nº 1', poblacion: 'Alcalá de Henares', provincia: 'Madrid' },
    { receptorNumber: '10002', name: 'La Bruja de Oro', poblacion: 'Sort', provincia: 'Lleida' },
    { receptorNumber: '10003', name: 'Doña Manolita', poblacion: 'Madrid', provincia: 'Madrid' },
    { receptorNumber: '10004', name: 'Administración nº 4', poblacion: 'Sevilla', provincia: 'Sevilla' },
    { receptorNumber: '10005', name: 'El Gato Negro', poblacion: 'Valencia', provincia: 'Valencia' },
    { receptorNumber: '10006', name: 'Administración nº 6', poblacion: 'Bilbao', provincia: 'Bizkaia' },
    { receptorNumber: '10007', name: 'La Pajarita', poblacion: 'Zaragoza', provincia: 'Zaragoza' },
    { receptorNumber: '10008', name: 'Administración nº 8', poblacion: 'A Coruña', provincia: 'A Coruña' },
    { receptorNumber: '10009', name: 'El Buen Augurio', poblacion: 'Málaga', provincia: 'Málaga' },
    { receptorNumber: '10010', name: 'Administración nº 10', poblacion: 'Palma', provincia: 'Illes Balears' },
];

export async function seedDemoUsers() {
    const passwordHash = await hashPassword(DEMO_PASSWORD);
    for (const admon of DEMO_ADMONS) {
        const email = `admon${admon.receptorNumber}@example.com`;
        await User.findOneAndUpdate(
            { email },
            {
                $set: { passwordHash, status: 'active', role: 'user' },
                $setOnInsert: { email, ...admon, phone: '900 000 000', contactName: 'Demo' },
            },
            { upsert: true },
        );
    }
    console.log(`[seed] ${DEMO_ADMONS.length} demo admons ready (password: ${DEMO_PASSWORD})`);
}
