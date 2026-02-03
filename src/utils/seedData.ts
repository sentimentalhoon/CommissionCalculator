/**
 * seedData.ts - 테스트 데이터 시딩 유틸리티 (Test Data Seeding Utility)
 * 
 * 미리 정의된 회원 데이터를 데이터베이스에 입력합니다.
 * Enters pre-defined member data into the database.
 * 
 * 사용 목적 (Purpose):
 * - 개발/테스트 환경에서 빠르게 데이터 구조 설정
 *   Quickly set up data structure in dev/test environment
 * - 실제 사용자 데이터를 기반으로 테스트
 *   Test with real user data structure
 * 
 * rawData 형식 (rawData Format):
 * 대마스터 아이디(닉네임) (실명)
 * └마스터 아이디(닉네임) (실명)
 *   └본사 아이디(닉네임) (실명)
 * 
 * "└" 기호로 계층 관계를 표현합니다.
 * The "└" symbol represents hierarchy relationships.
 */

// 로컬 데이터베이스 (Local database - Dexie/IndexedDB)
import { db } from '../db';

// 등급 상수 (Level constants)
import { LEVELS } from '../constants/levels';

const rawData = `
대마스터 000000(범실장)(범실장)
└마스터 asd1108(가락마카오) (이승일) +
└본사 fksl1817(야탑두기매장) (이승일) +
└본사 wlgns1817(가락마카오매장) (이승일) +
└마스터 baeceooo(목포트리플총판) (배준우) +
└본사 op1234(용당피시) (전금옥) +
└마스터 dnlswj(용봉생활) (이병기) +
└마스터 ekzmfh11(두암두꺼비) (최우혁) +
└마스터 eocl00(일곡킹콩) (조명진) +
└마스터 god20255(명당) (전동영) +
└마스터 gog12(여수골프) (박호성) +
└마스터 han1619(춘천PC클럽) (문종선) +
└마스터 hanam777(화성핑크) (이정아) +
└마스터 hihi666(광주미쓰고) (김민석) +
└본사 gogo777(각하미쓰고) (김민석) +
└본사 hihi777(첨단미쓰고) (최민재) +
└마스터 kim0415(용실장) (용희승) +
└본사 minkyua1(오사모) (여민주) +
└마스터 ktp7770(태실장) (김태표) +
└본사 hwangsb2(곰돌이1) (황석배) +
└마스터 mokpo669904(목포체리) (최창연) +
└마스터 qq1235(화성조타) (이광현) +
└본사 joo99(화성메가) (주유빈) +
└본사 lee1224(화성조타매장) (이광현) +
└본사 up1234(화성업PC) (김국진) +
└본사 wewe77(화성러키) (김예경) +
└마스터 s6110(HHH) (신호철) +
└본사 as4233(흑돼야지) (김동호) +
└본사 baeceoo(목포트리플) (배준우) +
└본사 sysy001(첨단대박) (이승연) +
└마스터 tmdwo0028(왕마귀) (이승재) +
└본사 song123(송PC) (송진안) +
└마스터 tnfl(봉선강남) (송슬기) +
└마스터 vvh1476(여수누님) (반지훈) +
└본사 aeae12(여수태양) (반지훈) +
└본사 asas1111(여수놀토) (이민영) +
└본사 cola100(콜라사장) (제길명) +
└마스터 zxc4910(여수둘리) (장연식) +
└본사 dmfdyd12(다복총판) (김동영) +
└부본사 dorw02(여수기아pc) (서순례) +
└부본사 dorwk03(여수천둥pc) (김형수) +
└부본사 dorwko01(여수현대pc) (최준경) +
└본사 mig0100(부삼PC) (조순제) +
└본사 qwer777(여수장첸) (장수환) +
└부본사 qwer888(여수장첸매장) (장수환) +
└부본사 simple0273(김실장이) (김태은) +
└본사 zxc49100(여수둘리매장) (장연식) +
대마스터 vip01(유실장) (유실장) +
└마스터 ccc3435(대빵껌) (조선의) +
└본사 kj333(금남피시) (이강욱) +
└본사 wthtcho(이기자) (조선의) +
└마스터 choi1661(스카이) (최윤제) +
└본사 choi16611(슬기로운) (최윤제) +
└본사 jin123(대라수pc) (진유라) +
└마스터 dhwht(양산뷰) (민은지) +
└본사 power(양산뷰티pc방) (민은지) +
└본사 sss777(무안pc) (문원균) +
└본사 zzzzz99(레몬pc) (김수곤) +
└마스터 dog7(도그) (강승우) +
└본사 yoojin4092(봉선신송) (이화순) +
└마스터 emrrn88(양산피시방) (김득진) +
└마스터 gold999(방림골드) (안준형) +
└본사 gold99(골드피시9) (안준형) +
└본사 golf999(오치킹덤) (이주성) +
└본사 you999(선운) (유삼현) +
└마스터 golf27670(첨단일번) (이은주) +
└본사 okok1234(오케이) (이용희) +
└마스터 jkjk001(양산따봉피시방) (김태용) +
└마스터 sbs111(2층pc) (신석) +
└마스터 sy0620(지니피시) (조성룡) +
└마스터 syy00(산타) (정소영) +
└마스터 wewe7700(목포우리) (홍길동) +
└본사 ssd0058(목포리아pc) (박민식) +
└마스터 ydr844(동천피시) (윤드로) +
└마스터 yju000(염주pc) (김정경) +
└마스터 you6936(상무따당) (정솔) +
└마스터 angel1089(나주배) 
└본사 angel5198(나주매장)
└본사 asdasd1(주안매장) 
└본사 maxx99(하남매장) 
└마스터 appa9986(첨단골드) 
└마스터 as9000(고양이) 
└마스터 asx777(풍암피씨) 
└마스터 dyd123(부엉이) 
└마스터 ecopc(첨단에코) 
└마스터 ehwjs(늑대) 
└마스터 gksqlzl(모시고)
└마스터 gksqlzl1(강력본드) 
└마스터 qw777(왕대박) 
└마스터 ssff001(중흥오피) 
└마스터 suzy999(부산신호) 
└마스터 upup(계림동) 
대마스터 aaa3000(피시피시2) 
└마스터 tu1000(여우) 
대마스터 acac1005(두꺼비)
대마스터 ace1010(물범)
대마스터 acekim(인천피바다) 
대마스터 acepark(물개)
대마스터 admin(ok) 
대마스터 aksska000(서산투투) 
└마스터 cong1(타이거1) 
└본사 vip00(레드매장)
└본사 vip02(군청매장)
└본사 vip03(블랙매장)
└본사 vip05(청평매장)
대마스터 boss7777(하남보스) 
└마스터 ace1234(에이스PC)
└마스터 alstjr0619(인천뷰슬라PC) 
└마스터 boss77(하남보스2)
└마스터 ghavm2582(홈플대박) 
└마스터 ghkdwp8282(황제PC )
└마스터 gkgk4742(송이PC) 
└마스터 maid1234(메이드PC)
└마스터 miss7575(미스고PC)
└마스터 oxox0485(수완잭팟PC) 
└마스터 rtyu4567(따자윌산PC) 
└마스터 soso1234(CNC수완PC)
대마스터 coco13(인천택시13) 
└마스터 wj4962(가물치) 
대마스터 coco14(인천택시14)
└마스터 wj4961(망둥어)
대마스터 coco5(인천택시5)
└마스터 wj4964(카드카드) 
대마스터 coco6(인천택시6)
└마스터 wj4965(카드박사)
대마스터 dkzktldk(서산) (김충길) +
대마스터 dodo66(쌍촌퍼펙트) (정연운) +
└마스터 udt5566(화정퍼펙) (정연운) +
대마스터 erq99(휴지오) (송관종) +
대마스터 hanam7777(화성핑크총) (이정아) +
└마스터 tmd47hsh(블루피씨) (황혜경) +
대마스터 jmd88(안산) (송관종) +
대마스터 jmd999(안산대장) (최창수) +
대마스터 dkzktldk(서산) (김충길) +
대마스터 dodo66(쌍촌퍼펙트) (정연운) +
└마스터 udt5566(화정퍼펙) (정연운) +
대마스터 erq99(휴지오) (송관종) +
대마스터 hanam7777(화성핑크총) (이정아) +
└마스터 tmd47hsh(블루피씨) (황혜경) +
대마스터 jmd88(안산) (송관종) +
대마스터 jmd999(안산대장) (최창수) +
└마스터 tgg33(마리오) (서자영) +
대마스터 joy0000(조이피씨) (김성수) +
대마스터 juju(부평맨) (나수현) +
대마스터 jyjy777(대구조이) (김재원) +
대마스터 k3016(YSX) (공순영) +
└마스터 asas0011(수완놀자) (이록경) +
└마스터 axtt1729(용봉대복) (김창윤) +
└마스터 qwqw1212(동강pc) (문공예) +
└마스터 ttt888(첨단호박피시방) (김효식) +
대마스터 kpp33(라이터) (김용학) +
└마스터 cchh222(사이다) (한선옥) +
└마스터 cvg00(라이타) (박종균) +
└마스터 kpp333(개구리) (이재택) +
└마스터 kuku77(올챙이) (한철석) +
대마스터 mbc888(양산쏘) (김장열) +
대마스터 mj1212(사거리) (유재영) +
대마스터 mm7979(7979) (조훈희) +
대마스터 mm797979(797979) (서진자) +
└마스터 adoss77(여왕피시) (곽규봉) +
└마스터 cy7777(청룡랜드) (김승진) +
└마스터 mama(달마) (박성용) +
└마스터 mpmp(청룡pc) (신철윤) +
└마스터 qjqmf00(버블피씨) (박형열) +
└마스터 toto(중리동pc) (강용섭) +
대마스터 okok114(곰돌이) (남유자) +
└마스터 kb777(오소리) (권복이) +
└마스터 panda(판다) (최은정) +
└마스터 ax4431(원주pc) (김지수) +
대마스터 piepie(VIP) (김수환) +
대마스터 qaz1122(옐젤피시방) (임이화) +
대마스터 red88(평택골드) (김형철) +
대마스터 siis82(독수리) (조동현) +
대마스터 ss1002(양산22) (김미형) +
└마스터 st1122(양산투투) (박미영) +
대마스터 ss1004(양산33) (김미형) +
└마스터 sm1004(양산셋) (김은자) +
대마스터 ss1005(양산55) (김미형) +
대마스터 ss1007(양산77) (김미형) +
└마스터 lolo77(양산7번) (곽철권) +
대마스터 sscc00(당근총) (김향군) +
└마스터 tb3848(첨단탑) (박현인) +
대마스터 suzy777(부산영도) (이대환) 
대마스터 suzy888(부산총) (이대환) 
└마스터 1k1k2251(사계) (김입춘) +
└마스터 ghost9547(부산슈가) (김정숙) +
└마스터 lucifer9765(파트너) (김성근) +
└마스터 shina1001(부산대박) (여정은) +
대마스터 tb3849(첨단탑탑) (박현인) +
└마스터 ipip111(스핀호구) (박현인) +
└마스터 skp8097(환타) (박상현) +
└마스터 toppc1234(소금쟁이) (조석훈) +
대마스터 ttrop7442(순천블랙pc) (유현정) +
대마스터 tv1000(전주전주) (김미희) +
대마스터 vns1(vns1) (하대균) +
└마스터 jyh6265(아지트매장) (전용훈) +
대마스터 vns2(vns2) (하대균) +
└마스터 shg123(삼거리) (노희건) +
대마스터 vns3(vns3) (하대균) +
└마스터 c2001(존지pc) (류원남) +
대마스터 vns5(vns5) (하대균) +
└마스터 c20011(c20011) (최유정) +
└본사 jjbbhh123(허풍pc) (류원남) +
└본사 r5003(길길pc) (김옥길) +
대마스터 vovo09(이순신9) (안철헌) +
└마스터 bmg(낙타) (김혜영) +
대마스터 vovo11(이순신11) (안철헌) +
└마스터 isis(만수동) (정호동) +
대마스터 vovo17(이순신17) (안철헌) +
└마스터 pps(피피에스) (임명호) +
대마스터 vovo18(이순신18) (안철헌) +
└마스터 toop(티피) (이효숙) +
대마스터 vovo21(이순신21) (안철헌) +
└마스터 zozo00(원숭이) (이기민) +
대마스터 vovo22(이순신22) (안철헌) +
└마스터 bnbn777(땅콩) (홍종길) +
대마스터 vovo23(이순신23) (안철헌) +
└마스터 azsx123(장보고 ) (이광숙) +
대마스터 vovo24(이순신24) (안철헌) +
└마스터 jjmk003(비비) (장정수) +
대마스터 vovo25(이순신25) (안철헌) +
└마스터 titi(명왕) (김명종) +
대마스터 vovo26(이순신26) (안철헌) +
└마스터 yk7777(망고) (고윤기) +
대마스터 vpn7(수수로) (고해근) +
대마스터 wj4966(카드신) (김동진) +
대마스터 wj4969(방울뱀) (김동진) +
대마스터 wndehd77(고래피시방) (임성택) +
대마스터 zczc00(방림) (박영우) +
대마스터 zxc1356(서구금호) (최경) +
└마스터 asd1235(우산일번) (최경) +
└마스터 bbq1313(월곡하천) (이상은) +
└마스터 sdf1234(송정초원) (김병선) +
`;

export async function parseAndSeedData() {
    const lines = rawData.trim().split('\n');
    let parentStack: { id: number, level: string }[] = [];

    // Clear existing users? Or append? Assuming clear for clean slate as requested
    // Just for safety, let's append but check duplicates? Or clear.
    // User said "input for me", implying initial setup.
    await db.users.clear(); // Ensure clean slate
    await db.logs.clear();

    for (const line of lines) {
        const cleanLine = line.replace('└', '').replace('+', '').trim();

        // Parse: Level ID(NickName) (MemberName)
        // Regex to match: (Level) (ID)(\((NickName)\)) (\((MemberName)\))?
        // Actually the format is looser.
        // Let's split by spaces first.

        // Expected format: [Level] [ID][(NickName)] [(MemberName)] + (optional)
        // Example: 마스터 asd1108(가락마카오) (이승일)

        // Let's use regex
        // (Level) (ID)\((NickName)\)\s*(\((MemberName)\))?

        const match = cleanLine.match(/^([가-힣]+)\s+([a-zA-Z0-9]+)\(([^)]+)\)\s*(?:\(([^)]+)\))?/);
        if (!match) {
            console.warn("Skipping invalid line:", line);
            continue;
        }

        const level = match[1];
        const loginId = match[2];
        const nickName = match[3];
        const memberName = match[4] || ''; // Optional

        // Valid level check
        // if (!LEVELS.includes(level as any)) ...



        // Determine parent based on Level
        // Levels: 대마스터(0) > 마스터(1) > 본사(2) > 부본사(3)
        const currentLevelIdx = LEVELS.indexOf(level as any);

        if (currentLevelIdx === 0) {
            // Root
            parentStack = []; // Reset stack
        } else {
            // Find parent from stack
            // Parent level should be currentLevelIdx - 1
            // We look backwards in stack for the first item with level index < current
            // Actually simpler: The parent must be the LAST processed item of level (current - 1)

            // We need to keep track of the most recent node of each level?
            // Since the list is ordered depth-first, the parent is the last seen node of (level-1).

            // Just search the stack? No, stack isn't enough if we don't know the exact parent instance.
            // Wait, the input list is hierarchical.
            // "└" means it's a child of the previous line?
            // "Indent" logic.

            // Logic:
            // If Level is 'Master' (1), parent is the last 'GrandMaster' (0).
            // If Level is 'Bonsa' (2), parent is the last 'Master' (1).

            // So we need a map of "Last Seen Node for Level X".


            // Better: Strict array where index = level.
            // lastSeen[0] = GrandMaster ID
            // lastSeen[1] = Master ID
            // ...

            // Parent is always lastSeen[currentLevelIdx - 1]
        }

        // Add to DB
        const id = await db.users.add({
            loginId,
            name: nickName,
            memberName: memberName,
            level: level,
            parentId: parentStack[currentLevelIdx - 1]?.id || null,
            casinoRate: 0, // Default
            slotRate: 0, // Default
            losingRate: 0 // Default
        });

        // Update stack/lastSeen
        // Ensure array is big enough
        parentStack[currentLevelIdx] = { id: id as number, level };
        // Clear lower levels as they are no longer valid parents for new nodes (strictly speaking)
        parentStack.length = currentLevelIdx + 1;
    }

    alert("Data imported successfully!");
    window.location.reload();
}
