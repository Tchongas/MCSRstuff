#!/usr/bin/env python3
"""MCSR navranked stronghold generator.
Ports the MPK stronghold program to a single placed column of command blocks.
"""


def q(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')


def setblock(x, y, z, block, nbt=''):
    return f'/setblock {x} {y} {z} {block}' + ('{' + nbt + '}' if nbt else '')


def build_commands():
    commands = [
        "say Locating stronghold. This may take several seconds...",
        "forceload add -1 -1 0 0",
        "scoreboard objectives add sh dummy",
        "scoreboard players set ~16 sh 16",
        "scoreboard players set ~400 sh 400",
        "data merge storage sh {p:[0d,61d,0d]}",

        "summon armor_stand .0 0 .0 {Marker:1b,NoGravity:1b,Tags:[M]}",
        "summon armor_stand .0 0 .0 {Marker:1b,NoGravity:1b,Tags:[M],Rotation:[30f]}",
        "summon armor_stand .0 0 .0 {Marker:1b,NoGravity:1b,Tags:[M],Rotation:[60f]}",
        "summon armor_stand .0 0 .0 {Marker:1b,NoGravity:1b,Tags:[M],Rotation:[90f]}",
        "summon armor_stand .0 0 .0 {Marker:1b,NoGravity:1b,Tags:[M],Rotation:[120f]}",

        "execute as @e[tag=M] at @s positioned ^ ^ ^2048 store result score @s sh run locate stronghold",
        "scoreboard players set $$D sh 9999",
        "execute as @e[tag=M] run scoreboard players operation $$D sh < @s sh",
        "execute as @e[tag=M] unless score $$D sh = @s sh run kill @s",

        "execute at @e[tag=M] positioned ^ ^ ^2048 positioned ~200 ~ ~ store result score $$dE sh run locate stronghold",
        "execute at @e[tag=M] positioned ^ ^ ^2048 positioned ~ ~ ~200 store result score $$dS sh run locate stronghold",

        "scoreboard players operation $$D sh *= $$D sh",
        "scoreboard players operation $$dE sh *= $$dE sh",
        "scoreboard players operation $$dS sh *= $$dS sh",

        "scoreboard players operation $$dE sh -= $$D sh",
        "scoreboard players remove $$dE sh 40000",
        "scoreboard players operation $$dE sh /= ~400 sh",

        "scoreboard players operation $$dS sh -= $$D sh",
        "scoreboard players remove $$dS sh 40000",
        "scoreboard players operation $$dS sh /= ~400 sh",

        "execute as @e[tag=M] at @s run tp @s ^ ^ ^2.048",
        "execute as @e[tag=M] store result score $$X sh run data get entity @s Pos[0] 1000",
        "execute as @e[tag=M] store result score $$Z sh run data get entity @s Pos[2] 1000",

        "scoreboard players operation $$X sh -= $$dE sh",
        "scoreboard players operation $$Z sh -= $$dS sh",

        "scoreboard players add $$X sh 8",
        "scoreboard players add $$Z sh 8",
        "scoreboard players operation $$X sh /= ~16 sh",
        "scoreboard players operation $$Z sh /= ~16 sh",
        "scoreboard players operation $$X sh *= ~16 sh",
        "scoreboard players operation $$Z sh *= ~16 sh",
        "scoreboard players add $$X sh 3",
        "scoreboard players add $$Z sh 3",

        "say Stronghold found. Loading chunks...",

        "gamerule fallDamage false",
        "setblock 8 ~ 8 end_gateway{ExitPortal:{Y:120,Z:0},ExactTeleport:1}",
        "execute store result block 8 ~ 8 ExitPortal.X int 1 run scoreboard players get $$X sh",
        "execute store result block 8 ~ 8 ExitPortal.Z int 1 run scoreboard players get $$Z sh",

        "execute store result storage sh p[0] double 1 run scoreboard players get $$X sh",
        "execute store result storage sh p[2] double 1 run scoreboard players get $$Z sh",
        "data modify entity @e[tag=M,limit=1] Pos set from storage sh p",
        "execute as @e[tag=M,limit=1] at @s run forceload add ~-64 ~-64 ~63 ~63",

        "say Teleporting to stronghold...",
        "tp @p 8.5 ~ 8.5",

        # allow chunks to load
        "say Waiting for chunks...",
        "say Waiting for chunks.. (1)",
        "say Waiting for chunks.. (2)",
        "say Waiting for chunks.. (3)",

        # set up search markers at the stronghold
        "data merge entity @e[tag=M,limit=1] {Rotation:[0f],Tags:[M,MM]}",
        # search the center chunk and the 8 neighbouring chunks
        "execute at @e[tag=MM] run summon armor_stand ~-16 ~ ~-16 {Tags:[M],Marker:1b,NoGravity:1b,Rotation:[0f]}",
        "execute at @e[tag=MM] run summon armor_stand ~-16 ~ ~    {Tags:[M],Marker:1b,NoGravity:1b,Rotation:[0f]}",
        "execute at @e[tag=MM] run summon armor_stand ~-16 ~ ~16  {Tags:[M],Marker:1b,NoGravity:1b,Rotation:[0f]}",
        "execute at @e[tag=MM] run summon armor_stand ~    ~ ~-16  {Tags:[M],Marker:1b,NoGravity:1b,Rotation:[0f]}",
        "execute at @e[tag=MM] run summon armor_stand ~    ~ ~16  {Tags:[M],Marker:1b,NoGravity:1b,Rotation:[0f]}",
        "execute at @e[tag=MM] run summon armor_stand ~16  ~ ~-16  {Tags:[M],Marker:1b,NoGravity:1b,Rotation:[0f]}",
        "execute at @e[tag=MM] run summon armor_stand ~16  ~ ~    {Tags:[M],Marker:1b,NoGravity:1b,Rotation:[0f]}",
        "execute at @e[tag=MM] run summon armor_stand ~16  ~ ~16  {Tags:[M],Marker:1b,NoGravity:1b,Rotation:[0f]}",

        "say Searching for stronghold starter...",

        # place the all-Y starter-search chain at the stronghold
        'execute at @e[tag=MM,limit=1] run setblock ~ ~1 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"scoreboard players add .tick sh 1"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~ ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute as @e[tag=M,tag=!B] at @s if block ~ ~ ~ smooth_stone_slab run tag @s add B"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-1 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute as @e[tag=M,tag=!B] at @s if block ~ ~ ~ smooth_stone_slab[type=bottom] run tag @s add B"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-2 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute at @e[tag=M] if block ~ ~ ~ bedrock run scoreboard players add $$c sh 1"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-3 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute as @e[tag=B] run scoreboard players add $$c sh 1"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-4 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute unless entity @e[tag=M] run scoreboard players add $$c sh 1"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-5 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute if score .tick sh matches 120.. run scoreboard players add $$c sh 1"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-6 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute if score .tick sh matches 120.. unless entity @e[tag=B] run say Stronghold starter not found"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-7 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute at @e[tag=B] run fill ~-1 ~-1 ~-1 ~1 ~-1 ~1 stone_bricks"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-8 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute at @e[tag=B] run say Done! Teleporting to stronghold starter."}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-9 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute at @e[tag=B] run tp @p ~.5 ~ ~.5 ~ ~"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-10 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute if score $$c sh matches 1.. run setblock ~ ~12 ~ air"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-11 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"gamerule fallDamage true"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-12 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"kill @e[tag=M]"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-13 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"forceload remove all"}',
        'execute at @e[tag=MM,limit=1] run setblock ~ ~-14 ~ chain_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"scoreboard objectives remove sh"}',
        # place the repeating block last so the chain is fully built before it starts ticking
        'execute at @e[tag=MM,limit=1] run setblock ~ ~2 ~ repeating_command_block[facing=down]{auto:1b,UpdateLastExecution:1b,Command:"execute as @e[tag=M,tag=!B] at @s run tp @s ~ ~-1 ~"}',
    ]
    return commands


def main():
    commands = build_commands()
    out = []
    out.append('/scoreboard objectives add sh dummy')
    out.append(setblock('~-1', '~-1', '~', 'repeating_command_block[facing=east]',
                        'auto:1b,UpdateLastExecution:1b,Command:"scoreboard players add .step sh 1"'))
    for i, cmd in enumerate(commands, 1):
        x = f'~{i-1}' if i > 1 else '~'
        chain = f'execute if score .step sh matches {i} run {cmd}'
        out.append(setblock(x, '~-1', '~', 'chain_command_block[facing=east]',
                            f'auto:1b,UpdateLastExecution:1b,Command:"{q(chain)}"'))
    cleanup = f'execute if score .step sh matches {len(commands)+1} run setblock ~-{len(commands)+1} ~ ~ air'
    x = f'~{len(commands)}'
    out.append(setblock(x, '~-1', '~', 'chain_command_block[facing=east]',
                        f'auto:1b,UpdateLastExecution:1b,Command:"{q(cleanup)}"'))
    with open('command.txt', 'w') as f:
        f.write(';\n'.join(out))
    print(f'Wrote {len(out)} commands to command.txt')


if __name__ == '__main__':
    main()
