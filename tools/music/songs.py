from synth import *
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def nm(s):
    n = NOTE[s[0]]; i = 1
    while i < len(s) and s[i] in '#b': n += 1 if s[i] == '#' else -1; i += 1
    return n + 12*(int(s[i:])+1)
def mel(tr, bus, inst, text, start_beat, vel=1.0, pan=0.0, oct=0, swing=0.0):
    b = start_beat
    for tok in text.split():
        n, d = tok.split('/'); d = float(d)
        if n != 'r':
            sw = swing if (b % 1) > 0.4 else 0
            tr.add(bus, inst(mtof(nm(n)+oct), d*tr.spb*0.95, vel*(0.9+0.2*rng.random())), b+sw, pan)
        b += d
    return b

def chords_to(tr, bus, inst, prog, beats_per, vel=1.0, pan=0.0, pattern=None, oct=0, spread=0.0):
    for k, notes in enumerate(prog):
        b0 = k*beats_per
        if pattern is None:
            for j, m in enumerate(notes): tr.add(bus, inst(mtof(m+oct), beats_per*tr.spb, vel), b0 + j*spread, pan)
        else:
            for (off, idx, dur) in pattern:
                m = notes[idx % len(notes)] + 12*(idx // len(notes)) + oct
                tr.add(bus, inst(mtof(m), dur*tr.spb, vel*(0.85+0.3*rng.random())), b0+off, pan)

# ═════ 1. 달빛 정원 — 3/4, 72bpm, D장조 하프·첼레스타·플루트 ═════
def garden():
    tr = Track(72, 32, 3)
    P = [ch(50,'M7'), ch(59,'m7'), ch(55,'M7'), ch(57,'sus2'), ch(50,'add9'), ch(54,'m7'), ch(55,'M7'), ch(57,'7')]
    prog = (P*4)
    chords_to(tr, 'pad', lambda f,d,v: pad(f,d,v,1400), prog, 3, 0.8)
    arp = [(0,0,1),(0.5,1,1),(1,2,1),(1.5,3,1),(2,4,1),(2.5,2,1)]
    chords_to(tr, 'harp', harp, prog, 3, 0.75, -0.3, arp, oct=12)
    for k, c in enumerate(prog): tr.add('bass', bass(mtof(c[0]-12), 3*tr.spb*0.9, 0.7), k*3)
    A = "F#5/1.5 E5/.5 D5/1 | A5/2 F#5/1 | G5/1.5 F#5/.5 E5/1 | E5/3 | F#5/1.5 A5/.5 D6/1 | C#6/1.5 A5/.5 F#5/1 | G5/1 B5/1 A5/1 | A5/3"
    B = "B5/1.5 A5/.5 F#5/1 | D6/2 B5/1 | B5/1 A5/1 G5/1 | E5/3 | F#5/1 A5/1 D6/1 | E6/1.5 D6/.5 C#6/1 | B5/1 C#6/1 E6/1 | D6/3"
    mel(tr, 'bell', bell, A.replace('|',''), 24, 0.9, 0.2)
    mel(tr, 'bell', bell, B.replace('|',''), 48, 0.9, 0.2)
    mel(tr, 'lead', flute, A.replace('|',''), 72, 0.8, -0.1, oct=-12)
    for b in range(0, 96, 3):  # 귀뚜라미
        if rng.random() < 0.5: tr.add('fx', hat(0.25)*0.6, b + rng.random()*3, rng.uniform(-0.8,0.8))
    st = tr.render({'pad': (0.9, 0.5), 'harp': (1.0, 0.45), 'bass': (0.9, 0.15), 'bell': (0.8, 0.6), 'lead': (0.8, 0.5), 'fx': (0.35, 0.4)}, True)
    save('garden', st)

# ═════ 2. 사라진 기차역 — 4/4, 82bpm, F장조 로즈·로파이 드럼·플루트 ═════
def station():
    tr = Track(82, 32, 4)
    P = [ch(53,'M7'), ch(57,'m7'), ch(58,'M7'), ch(60,'7'), ch(50,'m7'), ch(55,'m7'), ch(58,'M7'), ch(60,'7')]
    prog = P*4
    chords_to(tr, 'keys', epiano, prog, 4, 0.9, 0.0, [(0,0,1.5),(0,1,1.5),(0,2,1.5),(0,3,1.5),(2.5,1,1),(2.5,2,1),(2.5,3,1)])
    for k, c in enumerate(prog):
        tr.add('bass', bass(mtof(c[0]-12), 1.4*tr.spb, 0.9), k*4); tr.add('bass', bass(mtof(c[0]-12+7), 0.5*tr.spb, 0.6), k*4+2.5)
    for bar in range(4, 32):  # 드럼: 덜컹덜컹 기차 느낌
        b = bar*4
        tr.add('drum', kick(0.8), b); tr.add('drum', kick(0.5), b+1.75); tr.add('drum', kick(0.6), b+2.5)
        tr.add('drum', snare(0.55), b+1); tr.add('drum', snare(0.6), b+3)
        for h in range(8): tr.add('drum', hat(0.5 if h%2 else 0.8), b+h*0.5 + (0.08 if h%2 else 0))
    A = "C6/1.5 A5/.5 G5/1 F5/1 E5/1.5 F5/.5 G5/2 A5/1 C6/1 D6/1.5 C6/.5 A5/3 r/1 G5/1.5 A5/.5 Bb5/1 A5/1 G5/2 F5/1 E5/1 F5/4 r/4"
    mel(tr, 'lead', flute, A, 32, 0.9, 0.15)
    mel(tr, 'lead', flute, A, 96, 0.9, 0.15)
    mel(tr, 'bell', bell, "F6/2 E6/2 D6/2 C6/2 Bb5/2 A5/2 G5/4", 72, 0.5, -0.4)
    st = tr.render({'keys': (1.0, 0.35), 'bass': (1.0, 0.1), 'drum': (0.75, 0.12), 'lead': (0.85, 0.45), 'bell': (0.6, 0.6)}, True)
    save('station', st)

# ═════ 3. 사진 속 마을 — 4/4, 104bpm, G장조 기타·글로켄·쉐이커 ═════
def photo():
    tr = Track(104, 32, 4)
    P = [ch(55,'M'), ch(62,'M'), ch(64,'m'), ch(60,'M'), ch(55,'M'), ch(59,'m'), ch(60,'M'), ch(62,'M')]
    prog = P*4
    chords_to(tr, 'guitar', harp, prog, 4, 0.8, -0.25, [(0,0,.5),(.5,1,.5),(1,2,.5),(1.5,3,.5),(2,0,.5),(2.5,2,.5),(3,1,.5),(3.5,3,.5)], oct=-12)
    for k, c in enumerate(prog): tr.add('bass', bass(mtof(c[0]-24), 1.8*tr.spb), k*4); tr.add('bass', bass(mtof(c[0]-17), 1.8*tr.spb, 0.7), k*4+2)
    for bar in range(0, 32):
        for s in range(8): tr.add('perc', shaker(0.9 if s%2 else 0.6), bar*4+s*0.5)
        if bar >= 8: tr.add('perc', kick(0.45), bar*4); tr.add('perc', kick(0.35), bar*4+2); tr.add('perc', snare(0.3), bar*4+1); tr.add('perc', snare(0.3), bar*4+3)
    A = "B5/1 D6/1 G6/1.5 F#6/.5 E6/1 D6/1 B5/2 C6/1 E6/1 D6/1.5 C6/.5 B5/4 A5/1 B5/1 C6/1 D6/1 E6/1.5 D6/.5 B5/2 C6/1 B5/1 A5/2 G5/4"
    mel(tr, 'glock', bell, A, 32, 0.85, 0.25)
    mel(tr, 'glock', bell, A, 96, 0.85, 0.25)
    mel(tr, 'lead', flute, A, 64, 0.8, -0.1, oct=-12)
    st = tr.render({'guitar': (1.0, 0.3), 'bass': (0.95, 0.1), 'perc': (0.6, 0.15), 'glock': (0.7, 0.45), 'lead': (0.8, 0.4)}, True)
    save('photo', st)

# ═════ 4. 그림자의 도시 — 4/4, 88bpm, C단조 신스 아르페·트립합 ═════
def shadow():
    tr = Track(88, 32, 4)
    P = [ch(48,'m9'), ch(44,'M7'), ch(41,'m7'), ch(43,'7')]
    prog = [c for c in P for _ in (0,)]*8
    chords_to(tr, 'pad', lambda f,d,v: pad(f,d,v,1100), [[n+12 for n in c[:4]] for c in prog], 4, 0.9)
    arp = [(i*0.25, [0,2,3,1][i%4] + (4 if i%8>=4 else 0), 0.25) for i in range(16)]
    chords_to(tr, 'arp', sqlead, prog, 4, 0.55, 0.3, arp, oct=24)
    for k, c in enumerate(prog):
        for o in (0, 0.75, 2, 2.5, 3.5): tr.add('bass', bass(mtof(c[0]-12), 0.6*tr.spb, 0.9, 'saw'), k*4+o)
    for bar in range(4, 32):
        b = bar*4
        tr.add('drum', kick(0.9), b); tr.add('drum', kick(0.6), b+0.75); tr.add('drum', kick(0.7), b+2.5)
        tr.add('drum', snare(0.7), b+1); tr.add('drum', snare(0.75), b+3)
        for h in range(16): tr.add('drum', hat(0.6 if h%4 else 0.9), b+h*0.25)
        if bar % 4 == 3: tr.add('drum', hat(0.6, True), b+3.5)
    A = "G5/1.5 Eb5/.5 C5/2 r/2 D5/1 Eb5/1 F5/2 Eb5/1 D5/1 C5/4 r/4 G5/1 Ab5/1 Bb5/1.5 Ab5/.5 G5/2 F5/1 Eb5/1 D5/2 Eb5/1 D5/1 C5/4"
    mel(tr, 'lead', flute, A, 48, 0.85, -0.2)
    mel(tr, 'bell', bell, A, 96, 0.6, 0.3, oct=12)
    st = tr.render({'pad': (0.9, 0.5), 'arp': (0.55, 0.45), 'bass': (0.9, 0.05), 'drum': (0.75, 0.1), 'lead': (0.8, 0.5), 'bell': (0.6, 0.6)}, True)
    save('shadow', st)

# ═════ 5. 마지막 저장소 — 4/4, 66bpm, Eb장조 합창 패드·종·피아노 ═════
def lastsave():
    tr = Track(66, 24, 4)
    P = [ch(51,'add9'), ch(46,'sus2'), ch(48,'m7'), ch(44,'M7'), ch(51,'add9'), ch(55,'m7'), ch(44,'M7'), ch(46,'sus2')]
    prog = P*3
    chords_to(tr, 'pad', lambda f,d,v: pad(f,d,v,2200), [[n+12 for n in c] for c in prog], 4, 1.0)
    chords_to(tr, 'piano', epiano, prog, 4, 0.7, -0.2, [(0,0,1),(1,1,1),(2,2,1),(3,3,1)], oct=12)
    for k, c in enumerate(prog): tr.add('bass', bass(mtof(c[0]-12), 3.9*tr.spb, 0.8), k*4)
    A = "Bb5/2 G5/1 Eb5/1 F5/3 r/1 G5/2 Bb5/1 C6/1 Bb5/4 Eb6/2 D6/1 Bb5/1 C6/3 r/1 Bb5/1 G5/1 F5/1 G5/1 Eb5/4"
    mel(tr, 'bell', bell, A, 32, 0.9, 0.2)
    mel(tr, 'bell', bell, A, 64, 0.9, -0.2, oct=12)
    for bar in range(8, 24, 2): tr.add('fx', bell(mtof(87), 3*tr.spb, 0.35), bar*4+2, 0.6)
    st = tr.render({'pad': (1.0, 0.6), 'piano': (0.8, 0.5), 'bass': (0.9, 0.2), 'bell': (0.7, 0.7), 'fx': (0.5, 0.8)}, True)
    save('lastsave', st)

# ═════ 6. 휴지통 섬 — 4/4, 98bpm, A장조 토이피아노 자장가 ═════
def trash():
    tr = Track(98, 32, 4)
    P = [ch(57,'M'), ch(64,'M'), ch(66,'m'), ch(62,'M'), ch(57,'M'), ch(62,'M'), ch(64,'7'), ch(57,'M')]
    prog = P*4
    for k, c in enumerate(prog):
        b = k*4
        tr.add('bass', bass(mtof(c[0]-24), 0.9*tr.spb), b); tr.add('bass', bass(mtof(c[0]-17), 0.9*tr.spb, 0.7), b+2)
        for o in (1, 3): 
            for m in c: tr.add('chord', toypiano(mtof(m), 0.8*tr.spb, 0.45), o+b, -0.2)
    for bar in range(8, 32):
        b = bar*4
        tr.add('perc', kick(0.4), b); tr.add('perc', kick(0.4), b+2)
        for s in (1, 3): tr.add('perc', snare(0.22), b+s)
        for s in range(4): tr.add('perc', shaker(0.7), b+s+0.5)
    A = "E6/.5 C#6/.5 A5/1 B5/.5 C#6/.5 D6/1 E6/1 A6/1 F#6/1 E6/1 D6/.5 E6/.5 F#6/1 E6/2 r/1 C#6/.5 D6/.5 E6/1 C#6/1 B5/1 A5/1 B5/1 C#6/1 D6/1 B5/1 A5/4"
    mel(tr, 'lead', toypiano, A, 32, 1.0, 0.25)
    mel(tr, 'lead', toypiano, A, 96, 1.0, 0.25)
    mel(tr, 'bell', bell, A, 64, 0.7, -0.25, oct=-12)
    st = tr.render({'bass': (0.9, 0.1), 'chord': (0.7, 0.3), 'perc': (0.6, 0.1), 'lead': (0.8, 0.45), 'bell': (0.7, 0.55)}, True)
    save('trash', st)

if __name__ == '__main__':
    for f in sys.argv[1:] or ['garden', 'station', 'photo', 'shadow', 'lastsave', 'trash']: globals()[f]()
